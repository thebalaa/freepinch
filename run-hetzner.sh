#!/bin/bash
set -e

# Activate virtualenv
if [ -d "venv" ]; then
    source venv/bin/activate
fi

# Load environment variables from .env file
if [ -f .env ]; then
    echo "Loading credentials from .env..."
    export $(grep -v '^#' .env | xargs)
else
    echo "Error: .env file not found"
    exit 1
fi

# Check required variables
if [ -z "$HCLOUD_TOKEN" ]; then
    echo "Error: HCLOUD_TOKEN not set in .env"
    exit 1
fi

if [ -z "$SSH_PUBLIC_KEY" ]; then
    echo "SSH_PUBLIC_KEY not set, generating SSH key..."

    # Use server-specific SSH key if SERVER_NAME is provided, otherwise use default
    if [ -n "$SERVER_NAME" ]; then
        SSH_KEY_PATH="./ssh-keys/${SERVER_NAME}_key"
        mkdir -p ./ssh-keys
    else
        SSH_KEY_PATH="./hetzner_key"
    fi

    # Always generate a new key for each deployment to avoid uniqueness errors
    if [ -f "$SSH_KEY_PATH" ]; then
        echo "Removing existing SSH key: $SSH_KEY_PATH"
        rm -f "$SSH_KEY_PATH" "$SSH_KEY_PATH.pub"
    fi

    echo "Creating new SSH key: $SSH_KEY_PATH"
    ssh-keygen -t ed25519 -f "$SSH_KEY_PATH" -N "" -C "hetzner-${SERVER_NAME:-instance}"
    echo "✅ SSH key created: $SSH_KEY_PATH"

    export SSH_PUBLIC_KEY="$(cat ${SSH_KEY_PATH}.pub)"
    export SSH_PRIVATE_KEY_PATH="$SSH_KEY_PATH"

    # Add to .gitignore to prevent committing private keys
    if ! grep -q "^hetzner_key$" .gitignore 2>/dev/null; then
        echo "hetzner_key" >> .gitignore
        echo "hetzner_key.pub" >> .gitignore
        echo "ssh-keys/" >> .gitignore
    fi
fi

# Check if first argument is a command
case "${1:-provision}" in
    list)
        echo "Listing all servers..."
        ansible-playbook hetzner-teardown.yml --tags list
        ;;
    delete|teardown|destroy)
        [ $# -gt 0 ] && shift
        echo "Running teardown playbook..."
        ansible-playbook hetzner-teardown.yml --tags delete "$@"
        ;;
    reconfigure)
        shift
        INSTANCE_NAME="${1:?Usage: run-hetzner.sh reconfigure <instance-name> [ansible args]}"
        shift

        # Read IP and SSH key from instance artifact
        ARTIFACT="./instances/${INSTANCE_NAME}.yml"
        if [ ! -f "$ARTIFACT" ]; then
            echo "Error: Instance artifact not found: $ARTIFACT"
            exit 1
        fi

        IP=$(grep '^\s*ip:' "$ARTIFACT" | head -1 | awk '{print $2}')
        KEY_FILE=$(grep '^\s*key_file:' "$ARTIFACT" | head -1 | awk '{print $2}' | tr -d '"' | sed 's/^"\(.*\)"$/\1/')

        if [ -z "$IP" ]; then
            echo "Error: Could not extract IP from $ARTIFACT"
            exit 1
        fi

        if [ -z "$KEY_FILE" ]; then
            echo "Error: Could not extract key_file from $ARTIFACT"
            exit 1
        fi

        echo "🔄 Reconfiguring instance: $INSTANCE_NAME"
        echo "   IP: $IP"
        echo "   SSH Key: $KEY_FILE"
        echo ""

        ansible-playbook reconfigure.yml \
            -i "${IP}," \
            --private-key="${KEY_FILE}" \
            "$@"
        ;;
    service)
        shift
        INSTANCE_NAME="${1:?Usage: run-hetzner.sh service <instance-name> <started|stopped> [--enable|--disable]}"
        shift
        OPENCLAW_STATE="${1:?Usage: run-hetzner.sh service <instance-name> <started|stopped>}"
        shift

        # Default: enable if starting, disable if stopping
        OPENCLAW_ENABLED="true"
        if [ "$OPENCLAW_STATE" = "stopped" ]; then
            OPENCLAW_ENABLED="false"
        fi

        # Override with explicit flag
        while [ $# -gt 0 ]; do
            case "$1" in
                --enable) OPENCLAW_ENABLED="true"; shift ;;
                --disable) OPENCLAW_ENABLED="false"; shift ;;
                *) shift ;;
            esac
        done

        # Read IP and SSH key from instance artifact
        ARTIFACT="./instances/${INSTANCE_NAME}.yml"
        if [ ! -f "$ARTIFACT" ]; then
            echo "Error: Instance artifact not found: $ARTIFACT"
            exit 1
        fi

        IP=$(grep '^\s*ip:' "$ARTIFACT" | head -1 | awk '{print $2}')
        KEY_FILE=$(grep '^\s*key_file:' "$ARTIFACT" | head -1 | awk '{print $2}' | tr -d '"' | sed 's/^"\(.*\)"$/\1/')

        if [ -z "$IP" ]; then
            echo "Error: Could not extract IP from $ARTIFACT"
            exit 1
        fi

        if [ -z "$KEY_FILE" ]; then
            echo "Error: Could not extract key_file from $ARTIFACT"
            exit 1
        fi

        echo "🔧 Managing openclaw service: $INSTANCE_NAME"
        echo "   Action: $OPENCLAW_STATE"
        echo "   Enabled: $OPENCLAW_ENABLED"
        echo "   IP: $IP"
        echo ""

        ansible-playbook openclaw-service.yml \
            -i "${IP}," \
            --private-key="${KEY_FILE}" \
            -e "openclaw_state=${OPENCLAW_STATE}" \
            -e "openclaw_enabled=${OPENCLAW_ENABLED}"
        ;;
    provision|*)
        [ $# -gt 0 ] && shift
        echo "⚡ Provisioning and installing RoboClaw (~2-3 minutes)..."
        ansible-playbook hetzner-finland-fast.yml "$@"
        ;;
esac
