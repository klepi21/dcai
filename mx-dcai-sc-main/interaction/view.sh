#!/bin/bash

mkdir -p reports

use_devnet() {
    source globals.devnet.sh
}

use_mainnet() {
    source globals.mainnet.sh
}

fetch_address_from_token() {
    local NETWORK=$1
    local LABEL=$2
    
    # Get the address from deployments.json using jq
    FETCHED_ADDRESS=$(jq -r --arg network "$NETWORK" --arg label "$LABEL" \
        '.[$network][] | select(.label == $label) | .address' ../deployments.json)
    
    # Export SC_ADDRESS so it's available when sourcing globals
    export SC_ADDRESS="$FETCHED_ADDRESS"
    if [ -n "$SC_ADDRESS" ] && [ "$SC_ADDRESS" != "null" ]; then
        echo "Using $LABEL address: $SC_ADDRESS"
    fi

}

# Select env and fetch address from label (defaults to "SC" if not provided)
case $1 in
    "D")
        echo "Using Devnet"
        NETWORK="devnet"
        LABEL="${2:-SC}"
        fetch_address_from_token "$NETWORK" "$LABEL"
        use_devnet
        ;;
    "1")
        echo "Using Mainnet"
        NETWORK="mainnet"
        LABEL="${2:-SC}"
        fetch_address_from_token "$NETWORK" "$LABEL"
        use_mainnet
        ;;
    *)
        echo "Require MultiversX chain id (D, 1). Ex $0 D [LABEL]" && exit
        ;;
esac

source snippets.sh

# Add your custom smart contract queries below this line
# Available function: view
# Example: view getUserBalance "$(./encode.sh erd1...)"

######################## START ########################

# view getSetup
# view getAllStrategies
# view getAllStrategiesOnlyNonces