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

# Add your custom smart contract interactions below this line
# Available functions: deploy, upgrade, changeOwnerAddress, claimDeveloperRewards, runTx
# Example: deploy "$(./encode.sh arg1)@$(./encode.sh arg2)"

setup() {        
    runTx '' 50000000000000000 setup @$(./encode.sh $1)@$(./encode.sh $2)@$(./encode.sh $3)@$(./encode.sh $4)@$(./encode.sh $5)@$(./encode.sh Daily)@$(./encode.sh 86400000)@$(./encode.sh Weekly)@$(./encode.sh 604800000)@$(./encode.sh Monthly)@$(./encode.sh 2592000000) 70000000
}

createStrategy() {
    runTx '' '' createStrategy @$(./encode.sh $1)@$(./encode.sh $2)@$(./encode.sh $3) 7000000
}

modifyStrategy() {
    runTx $OWNER_ADDRESS '' ESDTNFTTransfer @$(./encode.sh $1)@$(./encode.sh $2)@01@$(./encode.sh $SC_ADDRESS)@$(./encode.sh modifyStrategy)@$(./encode.sh $3)@$(./encode.sh $4)@$(./encode.sh $5) 8000000
}

deleteStrategy() {
    runTx $OWNER_ADDRESS '' ESDTNFTTransfer @$(./encode.sh $1)@$(./encode.sh $2)@01@$(./encode.sh $SC_ADDRESS)@$(./encode.sh deleteStrategy) 6000000
}

deposit() {
    runTx $OWNER_ADDRESS '' MultiESDTNFTTransfer @$(./encode.sh $SC_ADDRESS)@02@$(./encode.sh $1)@$(./encode.sh $2)@01@$(./encode.sh $USDC)@00@$(./encode.sh $3)@$(./encode.sh deposit) 8000000
}

withdraw() {
    runTx $OWNER_ADDRESS '' ESDTNFTTransfer @$(./encode.sh $1)@$(./encode.sh $2)@01@$(./encode.sh $SC_ADDRESS)@$(./encode.sh withdraw)@$(./encode.sh $3)@$(./encode.sh $4) 8000000
}

######################## START ########################

# deploy '' 110000000
# upgrade '' 110000000

# runTx '' '' setBotAddress @$(./encode.sh erd1s5ufsgtmzwtp6wrlwtmaqzs24t0p9evmp58p33xmukxwetl8u76sa2p9rv) 5000000
# runTx '' '' addAdmins @$(./encode.sh erd1u5p4njlv9rxvzvmhsxjypa69t2dran33x9ttpx0ghft7tt35wpfsxgynw4) 8000000

# setup $EGLD EGLD eGold 500000 2000
# createStrategy 1000000 Weekly 1000
# modifyStrategy DCAIEGLD-37d10f 01 1000000 Daily 10
# deleteStrategy DCAIEGLD-37d10f 01
# deposit DCAIEGLD-37d10f 3 5000000
# withdraw DCAIEGLD-37d10f 3 2000000 01