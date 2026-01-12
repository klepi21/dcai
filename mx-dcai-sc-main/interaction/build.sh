#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

echo
echo -e "${GREEN}🛠️ Starting build process...${NC}"

cd ..

echo
echo -e "${GREEN}✨ Formatting...${NC}"
if ! cargo fmt; then
    echo -e "${RED}❌ cargo fmt failed${NC}"
    exit 1
fi

echo
echo -e "${GREEN}🔍 Check for common mistakes...${NC}"
if ! cargo clippy; then
    echo -e "${RED}❌ cargo clippy failed${NC}"
    exit 1
fi

echo
echo -e "${GREEN}🔨 Building...${NC}"
if ! sc-meta all build; then
    echo -e "${RED}❌ sc-meta all build failed${NC}"
    exit 1
fi

echo
echo -e "${GREEN}⛓️ Generating proxies...${NC}"
if ! sc-meta all proxy; then
    echo -e "${RED}❌ sc-meta all proxy failed${NC}"
    exit 1
fi

# Check if abi-markdowner is installed and run it at the end
if command -v abi-markdowner &> /dev/null; then
    echo
    echo -e "${GREEN}📚 Generating documentation with abi-markdowner...${NC}"
    if ! abi-markdowner; then
        echo -e "${RED}❌ abi-markdowner failed${NC}"
        exit 1
    fi

    echo
    echo -e "${GREEN}✅ Build completed successfully with documentation using the abi-markdowner!${NC}"
else
    echo
    echo -e "${GREEN}✅ Build completed successfully!${NC}"

    echo
    echo -e "${YELLOW}⚠️  abi-markdowner is not installed. In order to generate documentation, install it with:${NC}"
    echo -e "${YELLOW}'pip install abi-markdowner'${NC}"
    echo
fi