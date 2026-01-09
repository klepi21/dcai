#!/usr/bin/env python3
"""
Script to query DCAi strategy token attributes for take profit analysis
1. Fetches token info from API to get owner (SC address)
2. Queries getAllStrategiesOnlyNonces to get all strategy nonces
3. Queries getStrategyTokenAttributes for each nonce
4. Extracts take_profit_percentage, dca_token_balance, and buys list
5. Sends takeProfit transactions for eligible nonces
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
LOG_FILE_PATH = os.path.join(SCRIPT_DIR, "takeprofit.log")

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(LOG_FILE_PATH),
        logging.StreamHandler()
    ]
)




# Configuration
TOKEN_IDENTIFIERS = []  # No longer used, using PARENT_SC_ADDRESS directly
TOKEN_API_BASE_URL = "https://api.multiversx.com/tokens"
GATEWAY_URL = "https://gateway.multiversx.com"
PROXY_URL = "https://gateway.multiversx.com"
CHAIN_ID = "1"  # Mainnet chain ID
PARENT_SC_ADDRESS = "erd1qqqqqqqqqqqqqpgqpwhknfcusvvu9efccfy9c72dh7neggyru7zsv8v9rg"
SC_FUNCTION_GET_DCA_CONTRACTS = "getDcaContracts"
SC_FUNCTION_GET_NONCES = "getAllStrategiesOnlyNonces"
SC_FUNCTION_GET_ATTRIBUTES = "getStrategyTokenAttributes"
SC_FUNCTION_GET_SETUP = "getSetup"
SC_FUNCTION_TAKE_PROFIT = "takeProfit"
PEM_FILE_PATH = 'xxxxx'
API_DELAY_SECONDS = 0.33  # Delay between API calls to avoid rate limiting
TRANSACTION_DELAY_SECONDS = 1.0  # Delay between transactions
ENABLE_TRANSACTIONS = True  # Set to True to enable transaction sending, False to disable


def fetch_token_price(token_identifier):
    """
    Fetch token price from the API by searching for the token identifier
    Returns: price (str) or None on error
    
    Note: EGLD (native token) uses the same price as WEGLD
    """
    try:
        # For EGLD native token, we'll search for WEGLD which has the same price
        search_ticker = token_identifier
        if token_identifier == "EGLD":
            search_ticker = "WEGLD"
        # Extract base ticker if identifier has suffix (e.g., WEGLD-d7c6bb -> WEGLD)
        elif '-' in token_identifier:
            search_ticker = token_identifier.split('-')[0]
        else:
            search_ticker = token_identifier
        
        url = f"{TOKEN_API_BASE_URL}?size=300"
        response = requests.get(url)
        response.raise_for_status()
        data = response.json()
        
        # Handle case where API returns a list or dict with data key
        tokens_list = data
        if isinstance(data, dict) and 'data' in data:
            tokens_list = data['data']
        elif not isinstance(data, list):
            tokens_list = [data] if data else []
        
        # Search for the token by identifier (exact match first, then by ticker prefix)
        for token in tokens_list:
            if isinstance(token, dict):
                identifier = token.get('identifier', '')
                ticker = token.get('ticker', '')
                
                # Try exact match first
                if identifier == token_identifier:
                    price = token.get('price')
                    if price is not None:
                        return str(price)
                
                # Try match by ticker (for cases like WEGLD-d7c6bb matching any WEGLD token)
                if ticker == search_ticker:
                    price = token.get('price')
                    if price is not None:
                        return str(price)
                
                # Also try identifier prefix match
                if identifier.startswith(search_ticker + '-'):
                    price = token.get('price')
                    if price is not None:
                        return str(price)
        
        return None
    except Exception as e:
        print(f"    Error fetching token price: {e}")
        import traceback
        traceback.print_exc()
        return None


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
        if not base64_str or base64_str == '':
            return ''
        bytes_data = base64.b64decode(base64_str)
        return bytes_data.hex()
    except:
        return ''


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
                    # Check if it's likely a contract address (starts with 000...0500)
                    # or just any address. Manager returns child addresses.
                    # We convert to bech32
                    addr = Address(decoded, "erd").bech32()
                    # Skip if it's the manager itself or known non-contracts
                    if addr != parent_sc_address and addr not in addresses:
                        # Simple heuristic: child contracts in this system seem to have 
                        # many null bytes at start
                        if decoded.startswith(b'\x00\x00\x00\x00\x00\x00\x00\x00'):
                            addresses.append(addr)
            except: pass
        return addresses
    except: return []

def query_get_setup(sc_address):
    """
    Query getSetup from the smart contract
    Returns: (dca_token_identifier, min_amount_per_swap, strategy_token_identifier, profit_fee_percentage, slippage_percentage, frequencies_list) or (None, None, None, None, None, None) on error
    
    Outputs:
    0: EgldOrEsdtTokenIdentifier (DCA token identifier)
    1: BigUint (min_amount_per_swap)
    2: TokenIdentifier (strategy token identifier)
    3: u64 (profit_fee_percentage)
    4: u64 (final_slippage_percentage)
    5: variadic<multi<bytes,u64>> (multi_result) - list of (frequency_name, frequency_millis) tuples
    """
    try:
        query_url = f"{GATEWAY_URL}/vm-values/query"
        
        request_body = {
            "scAddress": sc_address,
            "funcName": SC_FUNCTION_GET_SETUP,
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
            return None, None, None, None, None, None
        
        data = response.json()
        
        # Check for errors in response structure: data.data.data
        response_data = data.get('data', {}).get('data', {})
        if response_data:
            return_code = response_data.get('returnCode')
            if return_code and return_code != 'ok':
                error_msg = response_data.get('returnMessage') or return_code
                print(f"    Contract error: {error_msg}")
                return None, None, None, None, None, None
        
        # Get return data: data.data.data.returnData
        return_data = response_data.get('returnData')
        
        if not return_data or len(return_data) < 6:
            print(f"    Invalid response: insufficient data (got {len(return_data) if return_data else 0} values, expected at least 6)")
            return None, None, None, None, None, None
        
        # Index 0: EgldOrEsdtTokenIdentifier (DCA token identifier)
        dca_token_base64 = return_data[0]
        dca_token_identifier = base64_to_string(dca_token_base64)
        
        # Index 1: BigUint (min_amount_per_swap)
        min_amount_hex = base64_to_hex(return_data[1])
        min_amount_per_swap = hex_to_decimal(min_amount_hex)
        
        # Index 2: TokenIdentifier (strategy token identifier)
        strategy_token_base64 = return_data[2]
        strategy_token_identifier = base64_to_string(strategy_token_base64)
        
        # Helper function to parse u64 (8 bytes, little-endian)
        def parse_u64(hex_str):
            """Parse u64 from hex string (8 bytes, little-endian)"""
            if not hex_str or hex_str == '0':
                return '0'
            try:
                bytes_data = bytes.fromhex(hex_str)
                # u64 is max 8 bytes, but we might get fewer bytes (minimal representation)
                # If we have more than 8 bytes, only take the first 8
                if len(bytes_data) > 8:
                    bytes_data = bytes_data[:8]
                # If we have fewer than 8 bytes, pad with zeros at the end (for little-endian)
                elif len(bytes_data) < 8:
                    bytes_data = bytes_data + b'\x00' * (8 - len(bytes_data))
                return str(int.from_bytes(bytes_data, byteorder='little', signed=False))
            except:
                return '0'
        
        # Index 3: u64 (profit_fee_percentage)
        profit_fee_hex = base64_to_hex(return_data[3])
        profit_fee_percentage = parse_u64(profit_fee_hex)
        
        # Index 4: u64 (final_slippage_percentage)
        slippage_hex = base64_to_hex(return_data[4])
        slippage_percentage = parse_u64(slippage_hex)
        
        # Index 5: bool (paused)
        # Index 6+: variadic<Address>
        # Index 7+: variadic<multi<bytes,u64>> (multi_result)
        # We search for the frequencies which are at the end
        frequencies = []
        
        # New ABI has variadic<Address> before frequencies. 
        # Typically, we can detect the frequencies by looking for (bytes, u64) pairs at the end.
        # For simplicity, if we don't know the number of addresses, we can try to guess.
        # Usually there might be 0 or 1 address.
        
        # Let's try to find where frequencies start by checking the types or just skipping known number of fields.
        # Based on the ABI, frequencies start after bool (idx 5) and variadic<Address> (idx 6...).
        # We can look for the first element after index 6 that looks like a frequency name (base64 of bytes).
        
        # If we have only 1 address, frequencies start at index 7.
        # If 0 addresses, they start at index 6.
        # For now, let's assume index 6+ contains addresses and frequencies. 
        # We can try to skip everything until we find something that doesn't look like an address (32 bytes).
        
        search_idx = 6
        while search_idx < len(return_data):
            val_base64 = return_data[search_idx]
            try:
                val_bytes = base64.b64decode(val_base64)
                if len(val_bytes) == 32: # Looks like an address
                    search_idx += 1
                else:
                    break
            except:
                break
        
        if search_idx < len(return_data):
            freq_data = return_data[search_idx:]
            i = 0
            while i < len(freq_data):
                if i + 1 < len(freq_data):
                    freq_name_base64 = freq_data[i]
                    freq_name = base64_to_string(freq_name_base64)
                    freq_millis_hex = base64_to_hex(freq_data[i + 1])
                    freq_millis = parse_u64(freq_millis_hex)
                    frequencies.append((freq_name, freq_millis))
                    i += 2
                else:
                    break
        
        return dca_token_identifier, min_amount_per_swap, strategy_token_identifier, profit_fee_percentage, slippage_percentage, frequencies
        
    except Exception as e:
        print(f"    Error querying getSetup: {e}")
        import traceback
        traceback.print_exc()
        return None, None, None, None, None, None


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


def parse_swap_list(base64_list_data):
    """
    Parse List<Swap> from base64 encoded data
    
    In MultiversX smart contracts, List<Swap> types in returnData are encoded as:
    - A single base64 string that, when decoded, contains nested base64 strings
    - Each nested string represents one element of the list
    - For Swap structs, each element contains 3 base64-encoded fields:
      1. usdc_amount (BigUint)
      2. dca_token_amount (BigUint)  
      3. timestamp_millis (u64)
    
    Returns: list of dicts with parsed swap data, or empty list if parsing fails
    """
    swaps = []
    
    try:
        if not base64_list_data or base64_list_data == '':
            return swaps
        
        if not isinstance(base64_list_data, str):
            return swaps
        
        # Decode the outer base64 to get the list structure
        try:
            decoded_bytes = base64.b64decode(base64_list_data)
            
            if len(decoded_bytes) == 0:
                return swaps
            
            # The decoded bytes should contain nested base64-encoded structures
            # Try to decode as UTF-8 string (might be JSON array of base64 strings)
            try:
                decoded_str = decoded_bytes.decode('utf-8', errors='strict')
                if decoded_str.strip().startswith('['):
                    # It's a JSON array of base64-encoded Swap structs
                    nested_array = json.loads(decoded_str)
                    if isinstance(nested_array, list):
                        for swap_item in nested_array:
                            if isinstance(swap_item, str):
                                # Each swap_item is a base64 string containing [BigUint, BigUint, u64]
                                # Try to decode it as nested base64 array
                                try:
                                    swap_bytes = base64.b64decode(swap_item)
                                    swap_decoded = swap_bytes.decode('utf-8', errors='strict')
                                    if swap_decoded.strip().startswith('['):
                                        swap_fields = json.loads(swap_decoded)
                                        if len(swap_fields) >= 3 and all(isinstance(f, str) for f in swap_fields):
                                            swaps.append({
                                                'usdc_amount': hex_to_decimal(base64_to_hex(swap_fields[0])),
                                                'dca_token_amount': hex_to_decimal(base64_to_hex(swap_fields[1])),
                                                'timestamp_millis': parse_u64_big_endian(base64_to_hex(swap_fields[2]))
                                            })
                                except Exception as e:
                                    # Skip this swap if parsing fails
                                    continue
                        return swaps
            except (UnicodeDecodeError, json.JSONDecodeError):
                # Not UTF-8/JSON, might be binary encoded differently
                # For now, return empty - we'll debug with actual data
                pass
        except Exception as e:
            # Base64 decode failed
            pass
        
        # If we get here, we couldn't parse it - return empty list
        # The raw data will be printed for debugging
        return []
        
    except Exception as e:
        return []


def parse_u64_big_endian(hex_str):
    """Parse u64 from hex string (big-endian, for timestamps)"""
    if not hex_str or hex_str == '0':
        return '0'
    try:
        bytes_data = bytes.fromhex(hex_str)
        # Pad to 8 bytes at the beginning for big-endian
        if len(bytes_data) < 8:
            bytes_data = b'\x00' * (8 - len(bytes_data)) + bytes_data
        elif len(bytes_data) > 8:
            bytes_data = bytes_data[:8]
        return str(int.from_bytes(bytes_data, byteorder='big', signed=False))
    except:
        return '0'


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
        # 0: u64 (nonce)
        # 1: BigUint (amount_per_swap)
        # 2: bytes (dca_frequency)
        # 3: u64 (frequency_in_millis)
        # 4: u64 (take_profit_percentage)
        # 5: BigUint (usdc_balance)
        # 6: BigUint (dca_token_balance)
        # 7: u64 (last_executed_ts_millis)
        # 8: List<Swap> (buys)
        # 9: List<Swap> (sells)
        
        if not return_data or len(return_data) < 11:
            print(f"    Invalid response: insufficient data (got {len(return_data) if return_data else 0} values, expected 11)")
            return None
        
        # Helper function to parse u64 (8 bytes, little-endian)
        def parse_u64(hex_str):
            """Parse u64 from hex string (8 bytes, little-endian)"""
            if not hex_str or hex_str == '0':
                return '0'
            try:
                bytes_data = bytes.fromhex(hex_str)
                # u64 is max 8 bytes, but we might get fewer bytes (minimal representation)
                # If we have more than 8 bytes, only take the first 8
                if len(bytes_data) > 8:
                    bytes_data = bytes_data[:8]
                # If we have fewer than 8 bytes, pad with zeros at the end (for little-endian)
                elif len(bytes_data) < 8:
                    bytes_data = bytes_data + b'\x00' * (8 - len(bytes_data))
                return str(int.from_bytes(bytes_data, byteorder='little', signed=False))
            except:
                return '0'
        
        # 4: u64 (take_profit_percentage)
        # Parse same as TypeScript: base64ToHex then hexToDecimal, then divide by 1000
        take_profit_percentage_hex = base64_to_hex(return_data[4]) if return_data[4] else '0'
        take_profit_percentage_raw = hex_to_decimal(take_profit_percentage_hex)
        take_profit_percentage = float(take_profit_percentage_raw) / 1000.0
        
        # 6: BigUint (dca_token_balance)
        dca_token_balance_hex = base64_to_hex(return_data[6])
        dca_token_balance = hex_to_decimal(dca_token_balance_hex)
        
        # 8: bool (take_profit_condition_met)
        take_profit_condition_met = False
        if len(return_data) > 8:
            raw_b64 = return_data[8]
            val_hex = base64_to_hex(raw_b64)
            
            # DEBUG: Log raw values for take profit condition
            print(f"    [DEBUG] Nonce {nonce} Take Profit Check:")
            print(f"      Raw Base64: '{raw_b64}'")
            print(f"      Raw Hex:    '{val_hex}'")
            
            # In MultiversX, True is 01, False is empty or 00
            take_profit_condition_met = val_hex == '01'
            print(f"      Parsed Bool: {take_profit_condition_met}")
        
        # 9: List<Swap> (buys)
        buys_list_data = return_data[9]
        buys = parse_swap_list(buys_list_data)
        
        return {
            'take_profit_percentage': take_profit_percentage,
            'dca_token_balance': dca_token_balance,
            'take_profit_condition_met': take_profit_condition_met,
            'buys': buys,
            'buys_raw_base64': buys_list_data  # Keep raw data for debugging
        }
        
    except Exception as e:
        print(f"    Error querying nonce {nonce}: {e}")
        import traceback
        traceback.print_exc()
        return None


def send_take_profit_transaction(sc_address_str, nonces, current_nonce=None):
    """
    Send takeProfit transaction to smart contract
    Returns: (tx_hash, next_nonce) or (None, current_nonce) on error
    """
    try:
        # Load wallet
        pem_path = Path(PEM_FILE_PATH)
        signer = UserSigner.from_pem_file(pem_path)
        sender_address = signer.get_pubkey().to_address(hrp="erd")
        sender_address_str = sender_address.bech32()
        
        # Initialize provider
        provider = ProxyNetworkProvider(PROXY_URL)
        
        # Get nonce: use provided nonce if available, otherwise fetch from network
        if current_nonce is not None:
            nonce = current_nonce
            print(f"Using tracked nonce: {nonce}")
        else:
            print("Fetching account info for nonce...")
            account_on_network = provider.get_account(sender_address)
            nonce = account_on_network.nonce
            print(f"Fetched account nonce from network: {nonce}")
        
        # Encode nonces as hex arguments
        nonce_args = [encode_u64(n) for n in nonces]
        
        # Build function call data
        function_name = SC_FUNCTION_TAKE_PROFIT
        data_field = f"{function_name}@{'@'.join(nonce_args)}"
        
        print(f"Function: {SC_FUNCTION_TAKE_PROFIT}")
        print(f"Nonces: {nonces}")
        print(f"Data field: {data_field}")
        print(f"Transaction nonce: {nonce}")
        print()
        
        # Create transaction
        print("Creating transaction...")
        transaction = Transaction(
            sender=sender_address_str,
            receiver=sc_address_str,
            value=0,
            gas_limit=100000000,
            gas_price=1000000000,
            chain_id=CHAIN_ID,
            nonce=nonce,
            data=data_field.encode('utf-8')
        )
        
        print("Signing transaction...")
        
        # Sign transaction
        transaction_computer = TransactionComputer()
        tx_bytes = transaction_computer.compute_bytes_for_signing(transaction)
        signature = signer.sign(tx_bytes)
        transaction.signature = signature
        
        # Send transaction
        tx_hash = provider.send_transaction(transaction)
        
        print()
        print("-" * 60)
        print(f"✓ Take profit transaction sent successfully!")
        print(f"Transaction hash: {tx_hash}")
        print(f"View on explorer: https://explorer.multiversx.com/transactions/{tx_hash}")
        print("-" * 60)
        
        # Log the transaction
        logging.info(f"TX SUCCESS: Hash={tx_hash}, Strategies={nonces}, Type=TakeProfit")

        
        # Return transaction hash and next expected nonce
        next_nonce = nonce + 1
        return tx_hash, next_nonce
        
    except Exception as e:
        print()
        print("=" * 60)
        print(f"✗ Error sending take profit transaction: {e}")
        print("=" * 60)
        import traceback
        traceback.print_exc()
        return None, current_nonce



def main():
    """Main function to query strategies from the parent SC and perform take profit"""
    print("=" * 80)
    print(f"Starting Take Profit Bot on Mainnet")
    print(f"Parent SC: {PARENT_SC_ADDRESS}")
    print("=" * 80)
    
    # Track nonce manually to ensure correct sequencing
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
                print("No child DCA contracts discovered. This might be an error or there are no contracts yet.")
            else:
                print(f"Discovered {len(child_scs)} contracts: {child_scs}")
                
                # Step 2: Process each discovered contract
                for sc_address in child_scs:
                    print()
                    print(f"--- Processing DCA Contract: {sc_address} ---")
                    try:
                        nonces_to_take_profit, _ = process_parent_sc(sc_address)
                        
                        if nonces_to_take_profit and ENABLE_TRANSACTIONS:
                            print(f"Eligible nonces for take profit: {nonces_to_take_profit}")
                            tx_hash, next_nonce = send_take_profit_transaction(sc_address, nonces_to_take_profit, current_nonce)
                            if tx_hash:
                                current_nonce = next_nonce
                        elif nonces_to_take_profit:
                            print(f"DRY RUN: Eligible nonces: {nonces_to_take_profit}")
                        else:
                            print(f"No eligible nonces found for {sc_address}")
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


def process_parent_sc(sc_address_str):
    """
    Process the parent SC: query setup, get nonces, query attributes
    Returns: list of eligible nonces
    """
    print(f"Processing Smart Contract: {sc_address_str}")
    
    # Get nonces
    nonces = query_get_all_strategies_nonces(sc_address_str)
    if not nonces: 
        return [], sc_address_str

    print(f"Found {len(nonces)} strategy nonces.")
    
    eligible_nonces = []
    for nonce in nonces:
        attributes = query_strategy_token_attributes(sc_address_str, nonce)
        if not attributes: continue
        
        is_eligible = attributes.get('take_profit_condition_met', False)
        print(f"  Nonce {nonce} - take_profit_condition_met: {is_eligible}")
        
        # We also need balance > 0 to actually execute, but we'll only print the bool as requested
        dca_token_balance = float(attributes.get('dca_token_balance', 0)) / 10**18
        
        if is_eligible and dca_token_balance > 0:
            eligible_nonces.append(nonce)
    
    return eligible_nonces, sc_address_str


if __name__ == "__main__":
    main()

