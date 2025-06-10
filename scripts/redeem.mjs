/* eslint-disable */
import { ethers } from 'ethers'
import { generateLinkKeyandSignature, generateReceiverSig } from './utils/escrowSigUtils.mjs'

async function getSignature (linkKey, receiverAddr) {
  // User redeems MockUSDC from LinkdropEscrow
  const linkKeyWallet = new ethers.Wallet(linkKey)
  const receiverSig = await generateReceiverSig(linkKeyWallet, receiverAddr)
  /* await linkdropEscrow.connect(relayer).redeemRecovered(receiver.address, transferId, receiverSig, senderSig, sponsored); */
  return { receiverSig, transferId: linkKeyWallet.address }
}

const main = async () => {
  // CONSTANTS
  const RECEIVER_ADDRESS = process.env.RECEIVER_ADDRESS
  const LINK_KEY = process.env.LINK_KEY
  
  if (!RECEIVER_ADDRESS) throw new Error('RECEIVER_ADDRESS env var is not defined') 
  if (!LINK_KEY) throw new Error('LINK_KEY env var is not defined')

  const { receiverSig, transferId } = await getSignature(LINK_KEY, RECEIVER_ADDRESS)

  console.log({
    receiver: RECEIVER_ADDRESS,
    transferId,
    receiverSig
  })
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
