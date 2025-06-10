/* eslint-disable */
import { ethers } from 'ethers'

const main = async () => {
  // CONSTANTS
  const ESCROW_ADDRESS = '0xf55bc97a1965Be549BB4B184BD824d6Cf958B3D3'
  const JSON_RPC_URL = 'https://polygon-mumbai.infura.io/v3/6d66128c9cf74dba89d542c8571f7226'
  const SENDER_PK = ''

  const provider = new ethers.providers.JsonRpcProvider(JSON_RPC_URL)
  const sender = new ethers.Wallet(SENDER_PK, provider)

  // Define some values for the deposit
  const amount = ethers.utils.parseUnits('0.001', 18) // 0.001 MATIC
  const expiration = Math.floor(Date.now() / 1000) + 60 * 60 * 24 // 24 hours from now
  const linkWallet = ethers.Wallet.createRandom()
  const transferId = linkWallet.address
  const linkKey = linkWallet.privateKey

  const abi = [
    'function deposit(address transferId_, uint128 expiration_)'
  ]
  const escrow = new ethers.Contract(ESCROW_ADDRESS, abi, sender)

  const tx = await sender.sendTransaction({
    to: ESCROW_ADDRESS,
    value: amount,
    gasLimit: 250000, // Ensure you have enough gas
    data: escrow.interface.encodeFunctionData('deposit', [transferId, expiration])
  })

  console.log({ txHash: tx.hash, sender: sender.address, transferId, linkKey, expiration, amount: amount.toString() })
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
