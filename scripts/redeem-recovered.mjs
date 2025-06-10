/* eslint-disable */
import { ethers } from 'ethers'
import { generateLinkKeyandSignature, generateReceiverSig } from './utils/escrowSigUtils.mjs'

async function getSignatures (sender, escrowAddr, transferId, receiverAddr) {
  // User redeems MockUSDC from LinkdropEscrow
  const chainId = await sender.getChainId()
  const transferDomain = {
    name: 'LinkdropEscrow',
    version: '2',
    chainId, // Replace with your actual chainId
    verifyingContract: escrowAddr // Replace with your actual contract address
  }
  const { linkKey: newLinkKey, newLinkKeyId, senderSig } = await generateLinkKeyandSignature(sender, transferId, transferDomain)
  const newLinkKeyWallet = new ethers.Wallet(newLinkKey)
  const receiverSig = await generateReceiverSig(newLinkKeyWallet, receiverAddr)
  return { receiverSig, senderSig }
}

const main = async () => {
  // CONSTANTS
  const ESCROW_ADDRESS = '0x7B423996169618A4B9292ebb191B2c7A7140345E'
  const JSON_RPC_URL = 'https://polygon-mumbai.infura.io/v3/6d66128c9cf74dba89d542c8571f7226'
  const SENDER_PK = process.env.SENDER_PK
  const RECEIVER_ADDRESS = process.env.RECEIVER_ADDRESS
  const TRANSFER_ID = process.env.TRANSFER_ID
  
  if(!SENDER_PK) throw new Error('SENDER_PK env var is not defined')
  if(!RECEIVER_ADDRESS) throw new Error('RECEIVER_ADDRESS env var is not defined')
  if(!TRANSFER_ID) throw new Error('TRANSFER_ID env var is not defined')

  const provider = new ethers.providers.JsonRpcProvider(JSON_RPC_URL)
  const sender = new ethers.Wallet(SENDER_PK, provider)

  const { receiverSig, senderSig } = await getSignatures(sender, ESCROW_ADDRESS, TRANSFER_ID, RECEIVER_ADDRESS)

  console.log({
    receiver: RECEIVER_ADDRESS,
    transferId: TRANSFER_ID,
    receiverSig,
    senderSig
  })
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
