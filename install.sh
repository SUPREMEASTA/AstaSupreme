#!/bin/sh

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
RESET='\033[0m'

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd) || exit 1
cd "$SCRIPT_DIR" || exit 1

if [ ! -f package.json ]; then
    printf '%b\n' "${RED}package.json not found.${RESET}" >&2
    exit 1
fi

if command -v npm >/dev/null 2>&1; then
    if npm install --no-bin-links; then
        printf '%b\n' "${GREEN}Ready to go${RESET}"
        exit 0
    fi

    printf '%b\n' "${YELLOW}npm install failed. Trying yarn install...${RESET}"
else
    printf '%b\n' "${YELLOW}npm not found. Trying yarn install...${RESET}"
fi

if ! command -v yarn >/dev/null 2>&1; then
    if command -v corepack >/dev/null 2>&1; then
        corepack enable >/dev/null 2>&1 || true
        corepack prepare yarn@1.22.22 --activate || {
            printf '%b\n' "${RED}Could not activate Yarn.${RESET}" >&2
            exit 1
        }
    elif command -v npm >/dev/null 2>&1; then
        npm install --global yarn@1.22.22 || {
            printf '%b\n' "${RED}Could not install Yarn.${RESET}" >&2
            exit 1
        }
    else
        printf '%b\n' "${RED}Yarn is not installed and could not be activated.${RESET}" >&2
        exit 1
    fi
fi

if yarn install --no-bin-links; then
    printf '%b\n' "${GREEN}Ready to go${RESET}"
    exit 0
fi

printf '%b\n' "${RED}Installation failed with npm and Yarn.${RESET}" >&2
exit 1

