# Libre PoC

This PoC tests the process of calling from Chain 1 to Chain 2 and then back to Chain 1, the same as proposed in my analysis write-up:

1. LibreGatewayA sends a cross-chain message to GatewayTwo through Axelar Network
1. LibreGatewayB receives the message, makes appropriate state changes, and then calls back LibreGatewayA
1. LibreGatewayA receives the callback message and also makes the appropriate state changes

## How to run the PoC

## One-time setup

Install [nodejs](https://nodejs.org/en/download/). Run `node -v` to check your installation.

Support Node.js version 16.x and 18.x

1. Clone this repo:

```bash
git clone https://github.com/andreitoma8/axelar-examples.git
```

2. Navigate to `axelar-examples` and install dependencies:

```bash
npm install
```

3. Compile smart contracts:

```bash
npm run build
```

## Set environment variables

You can get started quickly with a random local key and `.env` file by running

```bash
npm run setup
```

Or you can manually copy the example `.env.example` file and fill in your EVM private key. See the [example Metamask Instructions](https://metamask.zendesk.com/hc/en-us/articles/360015289632-How-to-export-an-account-s-private-key) for exporting your private keys.

```bash
cp .env.example .env
```

Then update to your own private key.

## Running the local chains

```bash
npm run start
```

Leave this node running on a separate terminal before deploying and testing the dApps.

## Deploy the contracts

```bash
npm run deploy evm/libre-poc local
```

This will deploy the contracts to all the local chains and print out the contract addresses.

## Run the PoC

```bash
npm run execute evm/libre-poc local "Avalanche" "Polygon" "Hello, world!"
```

This will execute the PoC and print out the result.
