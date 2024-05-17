'use strict';

const {
    getDefaultProvider,
    constants: { AddressZero },
    utils: { defaultAbiCoder },
    BigNumber,
} = require('ethers');
const {
    utils: { deployContract },
} = require('@axelar-network/axelar-local-dev');

const LibreGatewayA = rootRequire('./artifacts/examples/evm/libre-poc/LibreGatewayA.sol/LibreGatewayA.json');
const LibreGatewayB = rootRequire('./artifacts/examples/evm/libre-poc/LibreGatewayB.sol/LibreGatewayB.json');

async function deploy(chain, wallet) {
    chain.provider = getDefaultProvider(chain.rpc);
    chain.wallet = wallet.connect(chain.provider);

    console.log(`Deploying LibreGatewayA for ${chain.name}.`);
    chain.gatewayA = await deployContract(wallet, LibreGatewayA, [chain.gateway, chain.gasService]);
    console.log(`Deployed LibreGatewayA for ${chain.name} at ${chain.gatewayA.address}.`);

    console.log(`Deploying LibreGatewayB for ${chain.name}.`);
    chain.gatewayB = await deployContract(wallet, LibreGatewayB, [chain.gateway, chain.gasService]);
    console.log(`Deployed LibreGatewayB for ${chain.name} at ${chain.gatewayB.address}.`);
}

async function execute(chains, wallet, options) {
    const { source, destination, calculateBridgeFee, args } = options;
    const message = args[2] || `Received message that written at ${new Date().toLocaleTimeString()}.`;

    console.log('--- Initially ---');

    console.log('Message of LibreGatewayA at ' + source.name + ' is : ' + (await source.gatewayA.message()));
    console.log('Message of LibreGatewayB at ' + destination.name + ' is : ' + (await destination.gatewayB.message()));

    const feeSource = await calculateBridgeFee(source, destination);
    const feeRemote = await calculateBridgeFee(destination, source);
    const totalFee = BigNumber.from(feeSource).add(feeRemote);

    const tx = await source.gatewayA
        .setRemoteValue(destination.name, destination.gatewayB.address, message, {
            value: totalFee,
        })
        .then((tx) => tx.wait());

    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    await sleep(60000);

    console.log('--- After sending a message ---');

    console.log('Message of LibreGatewayA at ' + source.name + ' is : ' + (await source.gatewayA.message()));
    console.log('Message of LibreGatewayB at ' + destination.name + ' is : ' + (await destination.gatewayB.message()));
}

// npm run deploy evm/libre-call local

// npm run execute evm/libre-call local "Avalanche" "Polygon" "Hello, world!"

module.exports = {
    deploy,
    execute,
};
