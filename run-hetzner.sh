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
    provision|*)
        [ $# -gt 0 ] && shift
        echo "⚡ Provisioning and installing RoboClaw (~2-3 minutes)..."
        ansible-playbook hetzner-finland-fast.yml "$@"
        ;;
esac
