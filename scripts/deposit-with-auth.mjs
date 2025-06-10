/* eslint-disable */
import { ethers } from 'ethers'
import { getAuthorization } from './utils/getEIP3009Authorization.mjs'

// Generate validAfter and validBefore timestamps
function getValidAfterAndBefore () {
  const now = Math.floor(Date.now() / 1000)
  const validAfter = now - 60 // valid 1 minute ago
  const validBefore = now + 60 * 60 // valid for the next 1 hour
  return [validAfter, validBefore]
}

const getDomain = async (usdcAddr, provider) => {
  // User approves LinkdropEscrow to spend MockUSDC
  // The EIP-712 data
  const abi = [
    'function name() view returns (string name)',
    'function version() view returns (string version)'
  ]
  const usdc = new ethers.Contract(usdcAddr, abi, provider)
  const name = await usdc.name()
  const version = '1' // await usdc.version()
  const chainId = await provider.getChainId()
  const domain = {
    name,
    version,
    verifyingContract: usdc.address, // Replace with the USDC contract address
    salt: '0x0000000000000000000000000000000000000000000000000000000000013881'
  }
  return domain
}

const getDepositAuthorization = async (escrowAddr, sender, amount, expiration, transferId, domain, fee) => {
  const [validAfter, validBefore] = getValidAfterAndBefore()
  const authorization = await getAuthorization(
    sender, 
    escrowAddr, 
    amount, 
    validAfter, 
    validBefore, 
    transferId, 
    expiration,
    domain, 
    fee
  )
  return authorization
}

const main = async () => {
  // CONSTANTS
  const ESCROW_ADDRESS = '0x7B423996169618A4B9292ebb191B2c7A7140345E'
  const USDC_ADDRESS = '0x0FA8781a83E46826621b3BC094Ea2A0212e71B23'
  const JSON_RPC_URL = 'https://polygon-mumbai.infura.io/v3/6d66128c9cf74dba89d542c8571f7226'
  const SENDER_PK = process.env.SENDER_PK
  if(!SENDER_PK) throw new Error('SENDER_PK env var is not defined')
  const FEE = '0'

  const provider = new ethers.providers.JsonRpcProvider(JSON_RPC_URL)
  const sender = new ethers.Wallet(SENDER_PK, provider)

  // Define some values for the deposit
  const amount = ethers.utils.parseUnits('1', 6) // 100 USDC
  const expiration = Math.floor(Date.now() / 1000) + 60 * 60 * 24 // 24 hours from now
  const linkWallet = ethers.Wallet.createRandom()
  const transferId = linkWallet.address
  const linkKey = linkWallet.privateKey

  const domain = await getDomain(USDC_ADDRESS, sender)

  const authorization = await getDepositAuthorization(
    ESCROW_ADDRESS, sender, amount, expiration, transferId, domain, FEE
  )

  console.log({ 
    authorization, 
    sender: sender.address, 
    transferId, 
    linkKey, 
    expiration, 
    amount: amount.toString() 
  })
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
