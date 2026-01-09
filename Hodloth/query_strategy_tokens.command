#!/usr/bin/env python3
"""
Script to query DCAi strategy token attributes from smart contract
1. Fetches token info from API to get owner (SC address)
2. Queries getAllStrategiesOnlyNonces to get all strategy nonces
3. Queries getStrategyTokenAttributes for each nonce
"""

import json
import base64
import time
import requests
import logging
import os
from pathlib import Path
from datetime import datetime
from multiversx_sdk_core import Address, Transaction, TransactionComputer
from multiversx_sdk_wallet import UserSigner
from multiversx_sdk_network_providers import ProxyNetworkProvider

# Setup logging with absolute path
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
LOG_FILE_PATH = os.path.join(SCRIPT_DIR, "query_strategy_tokens.log")

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(LOG_FILE_PATH),
        logging.StreamHandler()
    ]
)




# Configuration
TOKEN_IDENTIFIERS = []  # No longer used
TOKEN_API_BASE_URL = "https://api.multiversx.com/tokens"
GATEWAY_URL = "https://gateway.multiversx.com"
PROXY_URL = "https://gateway.multiversx.com"
CHAIN_ID = "1"  # Mainnet chain ID
PARENT_SC_ADDRESS = "erd1qqqqqqqqqqqqqpgqpwhknfcusvvu9efccfy9c72dh7neggyru7zsv8v9rg"
SC_FUNCTION_GET_DCA_CONTRACTS = "getDcaContracts"
SC_FUNCTION_GET_NONCES = "getAllStrategiesOnlyNonces"
SC_FUNCTION_GET_ATTRIBUTES = "getStrategyTokenAttributes"
SC_FUNCTION_BUY = "buy"
SC_FUNCTION_TAKE_PROFIT = "takeProfit"
PEM_FILE_PATH = 'xxxxx'
API_DELAY_SECONDS = 0.33  # Delay between API calls to avoid rate limiting
ENABLE_TRANSACTIONS = True  # Set to True to enable transaction sending, False to disable


def fetch_token_info(token_identifier):
    """Fetch token information from the API to get owner (smart contract address)"""
    print("=" * 60)
    print("Fetching token info from API...")
    print("=" * 60)
    
    try:
        url = f"{TOKEN_API_BASE_URL}?identifier={token_identifier}&includeMetaESDT=true"
        response = requests.get(url)
        response.raise_for_status()
        data = response.json()
        
        # Handle case where API returns a list
        if isinstance(data, list):
            if len(data) > 0:
                data = data[0]
            else:
                print("Error: API returned empty list")
                return None
        
        print(f"Token Identifier: {data.get('identifier')}")
        print(f"Token Name: {data.get('name')}")
        owner = data.get('owner')
        
        print(f"Owner (Smart Contract): {owner}")
        print()
        
        return owner
    except Exception as e:
        print(f"Error fetching token info: {e}")
        import traceback
        traceback.print_exc()
        return None


def encode_u64(value):
    """
    Encode u64 to hex string for contract arguments.
    MultiversX Gateway API expects minimal hex representation (e.g., nonce 1 = "01")
    """
    try:
        num = int(value)
        # Convert to minimal hex representation (2 chars, padded if needed)
        # e.g., 1 -> "01", 10 -> "0a", 255 -> "ff"
        return format(num, '02x')
    except:
        return '00'


def base64_to_hex(base64_str):
    """Decode base64 to hex string"""
    try:
        if not base64_str:
            return '0'
        bytes_data = base64.b64decode(base64_str)
        return bytes_data.hex()
    except:
        return '0'


def base64_to_string(base64_str):
    """Decode base64 to UTF-8 string"""
    try:
        if not base64_str:
            return ''
        bytes_data = base64.b64decode(base64_str)
        return bytes_data.decode('utf-8').replace('\x00', '')
    except:
        return ''


def hex_to_decimal(hex_str):
    """Convert hex string to decimal string"""
    try:
        if not hex_str or hex_str == '0':
            return '0'
        return str(int(hex_str, 16))
    except:
        return '0'


def query_get_dca_contracts(parent_sc_address):
    """
    Query getDcaContracts from the manager smart contract
    Returns: list of child SC addresses (bech32)
    """
    try:
        query_url = f"{GATEWAY_URL}/vm-values/query"
        request_body = {"scAddress": parent_sc_address, "funcName": SC_FUNCTION_GET_DCA_CONTRACTS, "args": []}
        response = requests.post(query_url, json=request_body)
        if not response.ok: return []
        
        data = response.json()
        return_data = data.get('data', {}).get('data', {}).get('returnData')
        if not return_data: return []
        
        addresses = []
        for item in return_data:
            try:
                decoded = base64.b64decode(item)
                if len(decoded) == 32:
                    addr = Address(decoded, "erd").bech32()
                    if addr != parent_sc_address and addr not in addresses:
                        if decoded.startswith(b'\x00\x00\x00\x00\x00\x00\x00\x00'):
                            addresses.append(addr)
            except: pass
        return addresses
    except: return []

def query_get_all_strategies_nonces(sc_address):
    """
    Query getAllStrategiesOnlyNonces from the smart contract
    Returns: list of nonces or None on error
    """
    try:
        query_url = f"{GATEWAY_URL}/vm-values/query"
        
        request_body = {
            "scAddress": sc_address,
            "funcName": SC_FUNCTION_GET_NONCES,
            "args": []
        }
        
        response = requests.post(
            query_url,
            json=request_body,
            headers={
                'Accept': 'application/json',
                'Content-Type': 'application/json',
            }
        )
        
        if not response.ok:
            error_text = response.text
            print(f"    API Error: {response.status_code} - {error_text}")
            return None
        
        data = response.json()
        
        # Check for errors in response structure: data.data.data
        response_data = data.get('data', {}).get('data', {})
        if response_data:
            return_code = response_data.get('returnCode')
            if return_code and return_code != 'ok':
                error_msg = response_data.get('returnMessage') or return_code
                print(f"    Contract error: {error_msg}")
                return None
        
        # Get return data: data.data.data.returnData
        return_data = response_data.get('returnData')
        
        if not return_data:
            print(f"    No return data")
            return None
        
        # Parse the variadic<u64> - each item is a u64 encoded as base64
        nonces = []
        for item in return_data:
            hex_str = base64_to_hex(item)
            if hex_str and hex_str != '0':
                try:
                    # u64 is 8 bytes, little-endian
                    nonce_bytes = bytes.fromhex(hex_str)
                    if len(nonce_bytes) >= 1:
                        # Take up to 8 bytes, pad if needed
                        padded = nonce_bytes[:8] + b'\x00' * (8 - len(nonce_bytes))
                        nonce = int.from_bytes(padded[:8], byteorder='little', signed=False)
                        nonces.append(nonce)
                except (ValueError, TypeError) as e:
                    print(f"    Error parsing nonce: {e}")
        
        return sorted(nonces)
        
    except Exception as e:
        print(f"    Error querying nonces: {e}")
        import traceback
        traceback.print_exc()
        return None


def query_strategy_token_attributes(sc_address, nonce):
    """
    Query getStrategyTokenAttributes from the smart contract using direct API call
    Returns: decoded attributes dict or None on error
    """
    try:
        # Encode nonce as u64 (minimal hex: "01", "02", etc.)
        nonce_hex = encode_u64(nonce)
        
        query_url = f"{GATEWAY_URL}/vm-values/query"
        
        request_body = {
            "scAddress": sc_address,
            "funcName": SC_FUNCTION_GET_ATTRIBUTES,
            "args": [nonce_hex]
        }
        
        response = requests.post(
            query_url,
            json=request_body,
            headers={
                'Accept': 'application/json',
                'Content-Type': 'application/json',
            }
        )
        
        if not response.ok:
            error_text = response.text
            print(f"    API Error: {response.status_code} - {error_text}")
            return None
        
        data = response.json()
        
        # Check for errors in response structure: data.data.data
        response_data = data.get('data', {}).get('data', {})
        if response_data:
            return_code = response_data.get('returnCode')
            if return_code and return_code != 'ok':
                error_msg = response_data.get('returnMessage') or return_code
                print(f"    Contract error: {error_msg}")
                return None
        
        # Get return data: data.data.data.returnData
        return_data = data.get('data', {}).get('data', {}).get('returnData')
        
        # According to ABI, getStrategyTokenAttributes returns 10 values:
        # 0: u64 (nonce - we can ignore as we already know it)
        # 1: BigUint (amount_per_swap)
        # 2: bytes (dca_frequency)
        # 3: u64 (frequency_in_millis)
        # 4: u64 (take_profit_percentage)
        # 5: BigUint (usdc_balance)
        # 6: BigUint (token_balance)
        # 7: u64 (last_executed_ts_millis)
        # 8: List<Swap> (buy history - we can ignore for now)
        # 9: List<Swap> (sell history - we can ignore for now)
        
        if not return_data or len(return_data) < 10:
            print(f"    Invalid response: insufficient data (got {len(return_data) if return_data else 0} values, expected 10)")
            return None
        
        # Helper function to parse u64 (8 bytes, little-endian)
        def parse_u64(hex_str):
            """Parse u64 from hex string (8 bytes, little-endian)"""
            if not hex_str or hex_str == '0':
                return '0'
            try:
                bytes_data = bytes.fromhex(hex_str)
                # u64 is max 8 bytes, but we might get fewer bytes (minimal representation)
                # MultiversX uses Big Endian for everything
                # Pad to 8 bytes at the beginning for big-endian
                if len(bytes_data) < 8:
                    bytes_data = b'\x00' * (8 - len(bytes_data)) + bytes_data
                elif len(bytes_data) > 8:
                    bytes_data = bytes_data[:8]
                return str(int.from_bytes(bytes_data, byteorder='big', signed=False))
            except Exception as e:
                # Debug: print error
                # print(f"    DEBUG: Error parsing u64 from hex '{hex_str}': {e}")
                return '0'
        
        # 0: u64 (nonce - skip it, we already know the nonce)
        # Skip return_data[0]
        
        # 1: BigUint (amount_per_swap)
        amount_per_swap_hex = base64_to_hex(return_data[1])
        amount_per_swap = hex_to_decimal(amount_per_swap_hex)
        
        # 2: bytes (dca_frequency)
        dca_frequency = base64_to_string(return_data[2])
        
        # 3: u64 (frequency_in_millis)
        frequency_in_millis_hex = base64_to_hex(return_data[3])
        frequency_in_millis = parse_u64(frequency_in_millis_hex)
        
        # 4: u64 (take_profit_percentage)
        take_profit_percentage_hex = base64_to_hex(return_data[4])
        take_profit_percentage = parse_u64(take_profit_percentage_hex)
        
        # 5: BigUint (usdc_balance)
        usdc_balance_hex = base64_to_hex(return_data[5])
        usdc_balance = hex_to_decimal(usdc_balance_hex)
        
        # 6: BigUint (token_balance)
        token_balance_hex = base64_to_hex(return_data[6])
        token_balance = hex_to_decimal(token_balance_hex)
        
        # 7: u64 (last_executed_ts_millis)
        # Note: Timestamp appears to be big-endian, not little-endian like other u64 values
        base64_val = return_data[7]
        if not base64_val or base64_val == '' or base64_val == 'AAAAAAAAAAA=':
            # Empty or zero base64 means never executed
            last_executed_ts_millis = '0'
        else:
            last_executed_ts_millis_hex = base64_to_hex(base64_val)
            last_executed_ts_millis = parse_u64(last_executed_ts_millis_hex)
        
        # Debug logging for raw values
        print(f"    [DEBUG] Nonce {nonce} Values:")
        # print(f"      Frequency (base64): {return_data[3] if len(return_data) > 3 else 'MISSING'}")
        
        # Format Frequency
        freq_readable = "Unknown"
        try:
            freq_ms = int(frequency_in_millis)
            freq_hours = freq_ms / (1000 * 60 * 60)
            if freq_hours == 24:
                freq_readable = f"Daily ({freq_ms} ms)"
            elif freq_hours == 168:
                freq_readable = f"Weekly ({freq_ms} ms)"
            elif freq_hours == 1:
                freq_readable = f"Hourly ({freq_ms} ms)"
            else:
                freq_readable = f"{freq_hours:.2f} hours ({freq_ms} ms)"
        except:
            freq_readable = f"{frequency_in_millis} ms"

        print(f"      Frequency: {freq_readable}")
        
        # Format Last Executed
        last_exec_readable = "Never"
        try:
            ts_ms = int(last_executed_ts_millis)
            if ts_ms > 0:
                dt_object = datetime.fromtimestamp(ts_ms / 1000)
                last_exec_readable = dt_object.strftime('%Y-%m-%d %H:%M:%S')
        except:
            pass
            
        print(f"      Last Executed: {last_exec_readable} (Timestamp: {last_executed_ts_millis})")
        
        # Raw value logging commented out to reduce noise but kept for reference if needed
        # print(f"      Last Executed (hex): {last_executed_ts_millis_hex if 'last_executed_ts_millis_hex' in locals() else 'N/A'}")


        return {
            'amount_per_swap': amount_per_swap,
            'dca_frequency': dca_frequency,
            'frequency_in_millis': frequency_in_millis,
            'take_profit_percentage': take_profit_percentage,
            'usdc_balance': usdc_balance,
            'token_balance': token_balance,
            'last_executed_ts_millis': last_executed_ts_millis
        }
        
    except Exception as e:
        print(f"    Error querying nonce {nonce}: {e}")
        import traceback
        traceback.print_exc()
        return None


def format_frequency_label(frequency_millis_str):
    """Convert frequency in milliseconds to label (daily, hourly, weekly, etc.)"""
    try:
        millis = int(frequency_millis_str)
        seconds = millis / 1000
        minutes = seconds / 60
        hours = minutes / 60
        days = hours / 24
        weeks = days / 7
        months = days / 30
        years = days / 365
        
        if years >= 1:
            return "yearly"
        elif months >= 1:
            return "monthly"
        elif weeks >= 1:
            return "weekly"
        elif days >= 1:
            return "daily"
        elif hours >= 1:
            return "hourly"
        elif minutes >= 1:
            return "minutely"
        else:
            return "every second"
    except:
        return frequency_millis_str


def format_time_ago(timestamp_millis_str):
    """Convert timestamp to human readable 'time ago' format (matches TypeScript logic)"""
    try:
        timestamp_millis = float(timestamp_millis_str)
        
        # If timestamp is 0, it means never executed
        if timestamp_millis == 0:
            return "Never"
        
        # Create date objects
        date = time.gmtime(timestamp_millis / 1000)  # Convert ms to seconds for time.gmtime
        now = time.time()
        current_time_millis = now * 1000
        
        diff_millis = current_time_millis - timestamp_millis
        
        # Calculate differences
        diff_mins = int(diff_millis / 60000)
        diff_hours = int(diff_millis / 3600000)
        diff_days = int(diff_millis / 86400000)
        
        # Format based on time difference (matching TypeScript logic)
        if diff_mins < 1:
            return "Just now"
        elif diff_mins < 60:
            return f"{diff_mins} {'minute' if diff_mins == 1 else 'minutes'} ago"
        elif diff_hours < 24:
            return f"{diff_hours} {'hour' if diff_hours == 1 else 'hours'} ago"
        elif diff_days < 7:
            return f"{diff_days} {'day' if diff_days == 1 else 'days'} ago"
        else:
            # For longer periods, format as date
            date_obj = datetime.fromtimestamp(timestamp_millis / 1000)
            now_obj = datetime.fromtimestamp(now)
            
            # Format: "Jan 15" or "Jan 15, 2024" if different year
            if date_obj.year == now_obj.year:
                return date_obj.strftime("%b %d")
            else:
                return date_obj.strftime("%b %d, %Y")
    except Exception as e:
        # If there's an error, return "Never"
        return "Never"


def check_timing_ok(timestamp_millis_str, frequency_label):
    """
    Check if enough time has passed since last execution based on frequency
    Returns True if timing is OK, False otherwise
    """
    try:
        timestamp_millis = float(timestamp_millis_str)
        
        # If timestamp is 0 (never executed), timing is always OK
        if timestamp_millis == 0:
            return True
        
        current_time_millis = time.time() * 1000
        diff_millis = current_time_millis - timestamp_millis
        
        # Define minimum time required based on frequency (in milliseconds)
        frequency_lower = frequency_label.lower()
        if 'hourly' in frequency_lower:
            min_time_ms = 60 * 60 * 1000  # 1 hour
        elif 'daily' in frequency_lower:
            min_time_ms = 24 * 60 * 60 * 1000  # 24 hours
        elif 'weekly' in frequency_lower:
            min_time_ms = 7 * 24 * 60 * 60 * 1000  # 7 days
        elif 'monthly' in frequency_lower:
            min_time_ms = 30 * 24 * 60 * 60 * 1000  # 30 days
        else:
            # Unknown frequency, don't allow swap
            return False
        
        return diff_millis >= min_time_ms
    except:
        return False




def send_buy_transaction(sc_address_str, nonces_with_balance, current_nonce=None):
    """
    Send a transaction to call the buy function with nonces that have sufficient balance and timing OK
    current_nonce: If provided, use this nonce. Otherwise, fetch from network.
    Returns: (tx_hash, next_nonce) or (None, current_nonce) on error
    """
    if not nonces_with_balance:
        print("No nonces to buy")
        return None, current_nonce
    
    print("=" * 60)
    print(f"Preparing buy transaction for {len(nonces_with_balance)} nonce(s): {nonces_with_balance}")
    print("=" * 60)
    print()
    
    try:
        # Load wallet from PEM file
        print("Loading wallet from PEM file...")
        pem_path = Path(PEM_FILE_PATH)
        signer = UserSigner.from_pem_file(pem_path)
        sender_address = signer.get_pubkey().to_address(hrp="erd")
        sender_address_str = sender_address.bech32()
        print(f"Loaded wallet: {sender_address_str}")
        
        # Initialize network provider
        provider = ProxyNetworkProvider(PROXY_URL)
        
        # Get nonce: use provided nonce if available, otherwise fetch from network
        if current_nonce is not None:
            nonce = current_nonce
            print(f"Using tracked nonce: {nonce}")
        else:
            # Fetch fresh nonce from network (only for first transaction)
            print("Fetching account info for nonce...")
            account_on_network = provider.get_account(sender_address)
            nonce = account_on_network.nonce
            print(f"Fetched account nonce from network: {nonce}")
        
        # Encode function name and arguments
        # Function name: "buy" as plain string (not hex)
        # Encode each nonce as u64 (minimal hex, 2 chars)
        encoded_nonces = [encode_u64(n) for n in nonces_with_balance]
        
        # Build the data field: function name + encoded nonces
        # Format: function_name@nonce1_hex@nonce2_hex@...
        data_parts = [SC_FUNCTION_BUY] + encoded_nonces
        data_field_str = "@".join(data_parts)
        
        # Convert to bytes (Transaction expects bytes for data field)
        data_field_bytes = data_field_str.encode('utf-8')
        
        print(f"Function: {SC_FUNCTION_BUY}")
        print(f"Nonces: {nonces_with_balance}")
        print(f"Data field: {data_field_str}")
        print(f"Transaction nonce: {nonce}")
        print()
        
        # Create transaction
        print("Creating transaction...")
        transaction = Transaction(
            sender=sender_address_str,
            receiver=sc_address_str,
            value=0,  # No EGLD value needed for smart contract call
            gas_limit=100000000,  # Gas limit for buy transaction
            gas_price=1000000000,
            chain_id=CHAIN_ID,
            nonce=nonce,
            data=data_field_bytes  # Data as bytes
        )
        
        print("Signing transaction...")
        # Sign transaction
        transaction_computer = TransactionComputer()
        tx_bytes = transaction_computer.compute_bytes_for_signing(transaction)
        transaction.signature = signer.sign(tx_bytes)
        
        print("Sending transaction...")
        tx_hash = provider.send_transaction(transaction)
        
        print()
        print("-" * 60)
        print(f"✓ Buy transaction sent successfully!")
        print(f"Transaction hash: {tx_hash}")
        print(f"View on explorer: https://explorer.multiversx.com/transactions/{tx_hash}")
        print("-" * 60)
        
        # Log the transaction
        logging.info(f"TX SUCCESS: Hash={tx_hash}, Strategies={nonces_with_balance}, Type=Buy")

        
        # Return transaction hash and next expected nonce
        next_nonce = nonce + 1
        return tx_hash, next_nonce
        
    except Exception as e:
        print()
        print("=" * 60)
        print(f"✗ Error sending buy transaction: {e}")
        print("=" * 60)
        import traceback
        traceback.print_exc()
        return None, current_nonce


def process_token(token_identifier, all_eligible_nonces):
    """
    Process a single token: fetch info, get nonces, query attributes, and collect eligible nonces
    Returns: (sc_address_str, list of eligible nonces for this token)
    """
    print()
    print("=" * 80)
    print(f"Processing token: {token_identifier}")
    print("=" * 80)
    
    # Fetch token info
    sc_address_str = fetch_token_info(token_identifier)
    time.sleep(API_DELAY_SECONDS)  # Delay after API call
    
    if not sc_address_str:
        print(f"Failed to fetch token info for {token_identifier}")
        return None, []
    
    print("=" * 60)
    print(f"Querying getAllStrategiesOnlyNonces from smart contract...")
    print(f"Token: {token_identifier}")
    print(f"Smart Contract Address: {sc_address_str}")
    print(f"Gateway URL: {GATEWAY_URL}")
    print("=" * 60)
    print()
    
    print(f"Calling {SC_FUNCTION_GET_NONCES}...")
    nonces = query_get_all_strategies_nonces(sc_address_str)
    time.sleep(API_DELAY_SECONDS)  # Delay after API call
    
    if not nonces:
        print()
        print("=" * 60)
        print(f"No nonces found for token {token_identifier}")
        print("=" * 60)
        return sc_address_str, []
    
    print()
    print("=" * 60)
    print(f"Found {len(nonces)} strategy nonce(s) for {token_identifier}: {nonces}")
    print("=" * 60)
    print()
    
    # Query attributes for each nonce with delay to avoid rate limiting
    print("=" * 60)
    print(f"Querying strategy attributes for each nonce of {token_identifier}...")
    print(f"Delay: {API_DELAY_SECONDS} seconds between calls")
    print("=" * 60)
    print()
    
    successful_queries = 0
    eligible_nonces = []  # Track nonces that pass both balance and timing checks
    
    for i, nonce in enumerate(nonces):
        print(f"[{token_identifier}] [{i+1}/{len(nonces)}] Querying nonce {nonce} (encoded as: {encode_u64(nonce)})...")
        
        attributes = query_strategy_token_attributes(sc_address_str, nonce)
        time.sleep(API_DELAY_SECONDS)  # Delay after each API call
        
        if attributes:
            successful_queries += 1
            
            # Format values
            # USDC has 6 decimals, so divide by 10^6
            usdc_decimals = 10**6
            amount_per_swap_formatted = float(attributes['amount_per_swap']) / usdc_decimals
            usdc_balance_formatted = float(attributes['usdc_balance']) / usdc_decimals
            
            # Format frequency (just the label)
            frequency_label = format_frequency_label(attributes['frequency_in_millis'])
            
            # Format last executed time
            last_executed_ago = format_time_ago(attributes['last_executed_ts_millis'])
            
            # Check if balance is sufficient
            has_sufficient_balance = usdc_balance_formatted >= amount_per_swap_formatted
            balance_status = "balance ok" if has_sufficient_balance else "balance not ok"
            
            # Check if timing is OK (enough time has passed since last execution)
            timing_ok = check_timing_ok(attributes['last_executed_ts_millis'], frequency_label)
            timing_status = "timing ok" if timing_ok else "timing not ok"
            
            print(f"  ✓ Successfully retrieved data for nonce {nonce}:")
            print(f"    Amount per swap: {amount_per_swap_formatted:.6f} USDC")
            print(f"    DCA Frequency: {frequency_label}")
            print(f"    Take profit %: {attributes['take_profit_percentage']}")
            print(f"    USDC Balance: {usdc_balance_formatted:.6f} USDC")
            print(f"    Token Balance: {attributes['token_balance']}")
            print(f"    Last executed: {last_executed_ago}")
            print(f"    Nonce {nonce}: {balance_status}, {timing_status}")
            
            # Add to list only if BOTH balance and timing checks pass
            if has_sufficient_balance and timing_ok:
                eligible_nonces.append(nonce)
                all_eligible_nonces.append((token_identifier, sc_address_str, nonce))
        
        print()
    
    print("=" * 60)
    print(f"Successfully queried {successful_queries}/{len(nonces)} strategy token(s) for {token_identifier}")
    print(f"Eligible nonces for {token_identifier}: {eligible_nonces if eligible_nonces else 'None'}")
    print("=" * 60)
    
    return sc_address_str, eligible_nonces


def main():
    """Main function to query strategies from the parent SC and perform buy"""
    print("=" * 80)
    print(f"Starting Buy Bot on Mainnet")
    print(f"Parent SC: {PARENT_SC_ADDRESS}")
    print("=" * 80)
    
    current_nonce = None
    
    while True:
        try:
            print()
            print("=" * 60)
            print(f"NEW CYCLE: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
            print("=" * 60)
            
            # Step 1: Discover all DCA contracts from the manager
            print(f"Discovering DCA contracts from {PARENT_SC_ADDRESS}...")
            child_scs = query_get_dca_contracts(PARENT_SC_ADDRESS)
            
            if not child_scs:
                print("No child DCA contracts discovered.")
            else:
                print(f"Discovered {len(child_scs)} contracts: {child_scs}")
                
                # Step 2: Process each discovered contract
                for sc_address in child_scs:
                    print()
                    print(f"--- Processing DCA Contract: {sc_address} ---")
                    try:
                        sc_address, eligible_nonces = process_token_v2(sc_address)
                        
                        if eligible_nonces and ENABLE_TRANSACTIONS:
                            print(f"Sending buy transaction for nonces: {eligible_nonces}")
                            tx_hash, next_nonce = send_buy_transaction(sc_address, eligible_nonces, current_nonce)
                            if tx_hash:
                                current_nonce = next_nonce
                        elif eligible_nonces:
                            print(f"DRY RUN: Eligible nonces for buy: {eligible_nonces}")
                        else:
                            print(f"No eligible nonces for buy found for {sc_address}")
                    except Exception as e:
                        print(f"Error processing {sc_address}: {e}")
            
            print()
            print("Cycle completed. Waiting 1 hour...")
            time.sleep(3600)
            
        except Exception as e:
            print(f"Error in main loop: {e}")
            import traceback
            traceback.print_exc()
            time.sleep(60)

def process_token_v2(sc_address_str):
    """
    Revised process_token that takes SC address directly
    Returns: (sc_address, eligible_nonces)
    """
    print(f"Querying nonces for SC: {sc_address_str}")
    nonces = query_get_all_strategies_nonces(sc_address_str)
    if not nonces: return sc_address_str, []

    eligible_nonces = []
    for nonce in nonces:
        attributes = query_strategy_token_attributes(sc_address_str, nonce)
        if attributes:
            # Re-use logic from original process_token
            usdc_decimals = 10**6
            amount_per_swap_formatted = float(attributes['amount_per_swap']) / usdc_decimals
            usdc_balance_formatted = float(attributes['usdc_balance']) / usdc_decimals
            
            frequency_label = format_frequency_label(attributes['frequency_in_millis'])
            timing_ok = check_timing_ok(attributes['last_executed_ts_millis'], frequency_label)
            
            if usdc_balance_formatted >= amount_per_swap_formatted and timing_ok:
                print(f"  ✓ Nonce {nonce} ELIGIBLE for buy")
                eligible_nonces.append(nonce)
            else:
                reason = "insufficient balance" if usdc_balance_formatted < amount_per_swap_formatted else "timing not ok"
                print(f"  × Nonce {nonce} not eligible: {reason}")
    
    return sc_address_str, eligible_nonces

if __name__ == "__main__":
    main()
