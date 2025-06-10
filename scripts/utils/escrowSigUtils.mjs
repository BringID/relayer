/* eslint-disable */
import { ethers } from 'ethers'

export async function generateLinkKeyandSignature (sender, transferId, domain) {
  // Generate a new private key
  const linkKey = ethers.Wallet.createRandom()
  // Create the data to sign
  const types = {
    Transfer: [
      { name: 'linkKeyId', type: 'address' },
      { name: 'transferId', type: 'address' }
    ]
  }

  const message = {
    linkKeyId: linkKey.address,
    transferId
  }

  const senderSig = await sender._signTypedData(domain, types, message)
  return { linkKey: linkKey.privateKey, linkKeyId: linkKey.address, senderSig }
}

export async function generateReceiverSig (linkKeyWallet, receiver) {
  const messageHash = ethers.utils.solidityKeccak256(
    ['address'],
    [receiver]
  )
  const messageHashToSign = ethers.utils.arrayify(messageHash)
  const signature = await linkKeyWallet.signMessage(messageHashToSign)
  return signature
}
