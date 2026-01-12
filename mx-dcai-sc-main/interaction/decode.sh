#!/bin/bash

python3 - "$@" << 'EOF'
import sys
import subprocess

for i in range(1, len(sys.argv)):
    x = sys.argv[i]

    if len(x) == 64:
        result = subprocess.run(['mxpy', 'wallet', 'bech32', '--encode', x], capture_output=True, text=True)
        x = result.stdout.strip()
    else:
        try:
            x = bytes.fromhex(x).decode('utf-8')
            if x.isdigit():
                x = '"' + x + '"'
        except:
            if x[0:2] != '0x':
                x = '0x' + x
            x = int(x, base=0)
    
    print(str(x))
EOF