#!/bin/bash

# ======================================================================
# MultiversX Smart Contract Interaction Snippets
# 
# This file contains utility functions for interacting with MultiversX 
# smart contracts including deployment, upgrades, queries, and transactions.
# 
# Prerequisites:
# - Source the appropriate globals file (globals.devnet.sh or globals.mainnet.sh)
# - Ensure mxpy is installed and configured
# - Have a valid PEM file for the owner
# - Create reports directory for transaction outputs
# ======================================================================

# Initialize reports directory
mkdir -p ./reports

# ======================================================================
# QUERY FUNCTIONS
# ======================================================================

# Query a smart contract view function
# Usage: view <function_name> [arguments]
# Example: view getUserBalance $(./encode.sh erd1...)
view() {
    if [ -z "$1" ]; then
        echo "Error: Function name is required"
        echo "Usage: view <function_name> [arguments]"
        return 1
    fi

    echo "Querying function: $1"
    if [ -n "$2" ]; then
        echo "Arguments: $2"
        mxpy contract query $SC_ADDRESS --proxy $PROXY --function $1 --arguments $2
    else
        mxpy contract query $SC_ADDRESS --proxy $PROXY --function $1
    fi
    
    if [ $? -ne 0 ]; then
        echo "Error: Query failed. Check your function name and arguments."
        return 1
    fi
}

# ======================================================================
# OWNER MANAGEMENT FUNCTIONS
# ======================================================================

# Change the owner address of the smart contract
# Usage: changeOwnerAddress <new_owner_address_hex>
# Example: changeOwnerAddress $(./encode.sh erd1...)
changeOwnerAddress() {
    if [ -z "$1" ]; then
        echo "Error: New owner address (hex) is required"
        echo "Usage: changeOwnerAddress <new_owner_address_hex>"
        echo "Example: changeOwnerAddress \$(./encode.sh erd1...)"
        return 1
    fi

    echo "Changing owner address to: $1"
    echo "Transaction will be saved to: ./reports/changeOwnerAddress.report.json"
    
    mxpy tx new \
        --receiver $SC_ADDRESS --pem $OWNER_PEM \
        --gas-limit 10000000 --outfile ./reports/changeOwnerAddress.report.json \
        --send --value 0 --proxy $PROXY --chain $CHAIN_ID \
        --data ChangeOwnerAddress@$1
    
    if [ $? -eq 0 ]; then
        echo "✅ Owner change transaction sent successfully"
    else
        echo "❌ Failed to send owner change transaction"
        return 1
    fi
}

# Claim developer rewards from the smart contract
# Usage: claimDeveloperRewards
claimDeveloperRewards() {
    echo "Claiming developer rewards..."
    echo "Transaction will be saved to: ./reports/claimDeveloperRewards.report.json"
    
    mxpy tx new \
        --receiver $SC_ADDRESS --pem $OWNER_PEM \
        --gas-limit 10000000 --outfile ./reports/claimDeveloperRewards.report.json \
        --send --value 0 --proxy $PROXY --chain $CHAIN_ID \
        --data ClaimDeveloperRewards
    
    if [ $? -eq 0 ]; then
        echo "✅ Developer rewards claim transaction sent successfully"
    else
        echo "❌ Failed to send developer rewards claim transaction"
        return 1
    fi
}

# ======================================================================
# DEPLOYMENT FUNCTIONS
# ======================================================================

# Deploy the smart contract
# Usage: deploy [arguments] [gas_limit]
# Example: deploy "$(./encode.sh arg1)@$(./encode.sh arg2)" 30000000
deploy() {
    local GAS_LIMIT=${2:-20000000}  # Default gas limit is 20 million
    local ARGS=""

    # Check if bytecode exists
    if [ ! -f "$SC_BYTECODE" ]; then
        echo "Error: Smart contract bytecode not found at: $SC_BYTECODE"
        echo "Please build the contract first using: mxpy contract build"
        return 1
    fi

    if [ -n "$1" ]; then
        ARGS="--arguments $1"
        echo "Deploy arguments: $1"
    else
        echo "No deployment arguments provided"
    fi

    echo "Deploying smart contract..."
    echo "Bytecode: $SC_BYTECODE"
    echo "Gas limit: $GAS_LIMIT"
    echo "Transaction will be saved to: ./reports/deploy.report.json"

    mxpy contract deploy --bytecode $SC_BYTECODE \
        --pem $OWNER_PEM \
        --gas-limit $GAS_LIMIT \
        --metadata-payable-by-sc \
        --send --outfile ./reports/deploy.report.json \
        --proxy $PROXY --chain $CHAIN_ID \
        $ARGS

    if [ $? -eq 0 ]; then
        echo "✅ Deployment transaction sent successfully"
        echo "📄 Check ./reports/deploy.report.json for the contract address"
        echo "⚠️  Don't forget to update SC_ADDRESS in your .env file!"
    else
        echo "❌ Failed to deploy smart contract"
        return 1
    fi

    # Available metadata options (uncomment as needed):
    # --metadata-not-upgradeable
    # --metadata-not-readable
    # --metadata-payable
    # --metadata-payable-by-sc
}

# Upgrade the smart contract
# Usage: upgrade [arguments] [gas_limit]
# Example: upgrade "$(./encode.sh arg1)@$(./encode.sh arg2)" 30000000
upgrade() {
    local GAS_LIMIT=${2:-20000000}  # Default gas limit is 20 million
    local ARGS=""

    # Check if bytecode exists
    if [ ! -f "$SC_BYTECODE" ]; then
        echo "Error: Smart contract bytecode not found at: $SC_BYTECODE"
        echo "Please build the contract first using: mxpy contract build"
        return 1
    fi

    if [ -n "$1" ]; then
        ARGS="--arguments $1"
        echo "Upgrade arguments: $1"
    else
        echo "No upgrade arguments provided"
    fi

    echo "Upgrading smart contract..."
    echo "Contract address: $SC_ADDRESS"
    echo "Bytecode: $SC_BYTECODE"
    echo "Gas limit: $GAS_LIMIT"
    echo "Transaction will be saved to: ./reports/upgrade.report.json"

    mxpy contract upgrade $SC_ADDRESS --bytecode $SC_BYTECODE \
        --pem $OWNER_PEM \
        --gas-limit $GAS_LIMIT \
        --metadata-payable-by-sc \
        --send --outfile ./reports/upgrade.report.json \
        --proxy $PROXY --chain $CHAIN_ID \
        $ARGS

    if [ $? -eq 0 ]; then
        echo "✅ Upgrade transaction sent successfully"
        echo "📄 Check ./reports/upgrade.report.json for transaction details"
    else
        echo "❌ Failed to upgrade smart contract"
        return 1
    fi

    # Available metadata options (uncomment as needed):
    # --metadata-not-upgradeable
    # --metadata-not-readable
    # --metadata-payable
    # --metadata-payable-by-sc
}

# ======================================================================
# GENERIC TRANSACTION FUNCTION
# ======================================================================

# Execute a generic transaction to the smart contract
# Usage: runTx [receiver] [egld_value] [endpoint_name] [arguments] [gas_limit]
# Example: runTx $SC_ADDRESS 0 "buyTokens" "$(./encode.sh 100)" 15000000
runTx() {
    local RECEIVER=${1:-$SC_ADDRESS}     # Default receiver is the SC address
    local EGLD_VALUE=${2:-0}             # Default EGLD value is 0
    local ENDPOINT_NAME=${3:-""}         # Default endpoint name is empty
    local ARGUMENTS=${4:-""}             # Default arguments are empty
    local GAS_LIMIT=${5:-20000000}       # Default gas limit is 20 million
    local REPORT_FILE=${ENDPOINT_NAME:-"tx"}  # Default report file is tx.report.json
    local OUTFILE="./reports/$REPORT_FILE.report.json"

    # Validation
    if [ -z "$ENDPOINT_NAME" ]; then
        echo "Warning: No endpoint name provided, sending empty transaction"
    fi

    echo "Executing transaction..."
    echo "Receiver: $RECEIVER"
    echo "EGLD Value: $EGLD_VALUE"
    echo "Endpoint: $ENDPOINT_NAME"
    echo "Arguments: $ARGUMENTS"
    echo "Gas Limit: $GAS_LIMIT"
    echo "Output file: $OUTFILE"

    mxpy tx new \
        --receiver $RECEIVER --pem $OWNER_PEM \
        --gas-limit $GAS_LIMIT --outfile $OUTFILE \
        --send --value $EGLD_VALUE --wait-result \
        --proxy $PROXY --chain $CHAIN_ID \
        --data $ENDPOINT_NAME$ARGUMENTS

    if [ $? -eq 0 ]; then
        echo "✅ Transaction sent successfully"
        echo "📄 Transaction details saved to: $OUTFILE"
    else
        echo "❌ Transaction failed"
        return 1
    fi
}