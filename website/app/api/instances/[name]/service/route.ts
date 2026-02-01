import { readFile } from 'fs/promises'
import { join } from 'path'
import { parse } from 'yaml'
import { execSync } from 'child_process'
import { Client } from 'ssh2'

export const runtime = 'nodejs'

const PROJECT_ROOT = join(process.cwd(), '..')
const INSTANCES_DIR = join(PROJECT_ROOT, 'instances')

interface RouteContext {
  params: Promise<{ name: string }>
}

/**
 * GET - Check openclaw service status via direct SSH
 * Returns: { status: 'active' | 'inactive' | 'failed' | 'unknown', enabled: boolean }
 */
export async function GET(request: Request, context: RouteContext) {
  try {
    const { name } = await context.params
    const { ip, privateKey } = await getInstanceSSHDetails(name)

    const result = await sshExec(ip, privateKey,
      'sudo -u roboclaw bash -c "export XDG_RUNTIME_DIR=/run/user/$(id -u roboclaw); ' +
      'systemctl --user is-active openclaw-gateway 2>/dev/null || echo unknown; ' +
      'systemctl --user is-enabled openclaw-gateway 2>/dev/null || echo unknown"'
    )

    const lines = result.trim().split('\n')
    const status = lines[0]?.trim() || 'unknown'   // 'active', 'inactive', 'failed', 'unknown'
    const enabled = lines[1]?.trim() === 'enabled'

    return Response.json({ status, enabled, instanceName: name })
  } catch (error) {
    console.error('Error checking service status:', error)
    return Response.json(
      { error: error instanceof Error ? error.message : 'Failed to check service status' },
      { status: 500 }
    )
  }
}

/**
 * POST - Start or stop openclaw service via ansible playbook
 * Body: { action: 'start' | 'stop' }
 * Returns: { success: boolean, status: 'active' | 'inactive', instanceName: string }
 */
export async function POST(request: Request, context: RouteContext) {
  try {
    const { name } = await context.params
    const body = await request.json()
    const action = body.action

    if (action !== 'start' && action !== 'stop') {
      return Response.json(
        { error: 'Invalid action. Must be "start" or "stop".' },
        { status: 400 }
      )
    }

    const openclawState = action === 'start' ? 'started' : 'stopped'

    // Run the service management command synchronously
    // This typically takes 2-5 seconds
    const result = execSync(
      `./run-hetzner.sh service ${name} ${openclawState}`,
      {
        cwd: PROJECT_ROOT,
        env: { ...process.env },
        timeout: 30000,  // 30 second timeout
        encoding: 'utf-8',
      }
    )

    console.log(`[Service] ${action} openclaw on ${name}:`, result)

    // After the ansible command, verify the actual state via SSH
    const { ip, privateKey } = await getInstanceSSHDetails(name)
    const statusOutput = await sshExec(ip, privateKey,
      'sudo -u roboclaw bash -c "export XDG_RUNTIME_DIR=/run/user/$(id -u roboclaw); ' +
      'systemctl --user is-active openclaw-gateway 2>/dev/null || echo unknown"'
    )
    const actualStatus = statusOutput.trim()

    return Response.json({
      success: true,
      status: actualStatus,
      instanceName: name,
    })
  } catch (error) {
    console.error('Error managing service:', error)
    return Response.json(
      { error: error instanceof Error ? error.message : 'Failed to manage service' },
      { status: 500 }
    )
  }
}

// --- Helper functions ---

async function getInstanceSSHDetails(name: string): Promise<{ ip: string; privateKey: string }> {
  const artifactPath = join(INSTANCES_DIR, `${name}.yml`)
  const artifactContent = await readFile(artifactPath, 'utf-8')
  const artifact = parse(artifactContent)

  if (!artifact.instances || !artifact.instances[0]) {
    throw new Error('Invalid artifact format')
  }

  const instance = artifact.instances[0]
  const ip = instance.ip
  const keyFile = instance.ssh?.key_file

  if (!ip || !keyFile) {
    throw new Error('Missing IP or SSH key in artifact')
  }

  const keyPath = keyFile.startsWith('/') ? keyFile : join(PROJECT_ROOT, keyFile)
  const privateKey = await readFile(keyPath, 'utf-8')

  return { ip, privateKey }
}

function sshExec(ip: string, privateKey: string, command: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const conn = new Client()
    const timeout = setTimeout(() => {
      conn.end()
      reject(new Error('SSH connection timeout (10s)'))
    }, 10000)

    conn.on('ready', () => {
      clearTimeout(timeout)
      conn.exec(command, (err, stream) => {
        if (err) {
          conn.end()
          reject(err)
          return
        }

        let output = ''
        stream.on('data', (data: Buffer) => { output += data.toString() })
        stream.stderr?.on('data', (data: Buffer) => { output += data.toString() })
        stream.on('close', () => {
          conn.end()
          resolve(output)
        })
      })
    })

    conn.on('error', (err) => {
      clearTimeout(timeout)
      reject(err)
    })

    conn.connect({
      host: ip,
      port: 22,
      username: 'root',
      privateKey,
      readyTimeout: 10000,
      hostVerifier: () => true,
    })
  })
}
