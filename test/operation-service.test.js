/* eslint-disable */
const stageConfig = require('../stage-config')
const expect = require('chai').expect
const mongoose = require('mongoose')
const OperationService = require('../src/services/operation-service')
const Operation = require('../src/models/operation')

// Common constants for test data
const TEST_BATCH_ID = 'testBatch'
const TEST_CONTRACT_ADDRESS = '0x123'
const TEST_TO_1 = '0x123'
const TEST_TO_2 = '0x456'
const TEST_HASH_1 = '0xabc'
const TEST_HASH_2 = '0xdef'

// Helper to create a transaction object
function createTx({
  hash = TEST_HASH_1,
  data = '0x1234dataTest',
  maxFeePerGas = '0x10',
  maxPriorityFeePerGas = '0x1',
  gasLimit = '0x5208',
  value = '0x0',
  to = TEST_TO_1,
  nonce = 1
} = {}) {
  return { hash, data, maxFeePerGas, maxPriorityFeePerGas, gasLimit, value, to, nonce }
}

// Helper to build expected params for transaction
function buildExpectedParams(tx) {
  return {
    to: tx.to,
    value: tx.value,
    gasLimit: tx.gasLimit,
    maxPriorityFeePerGas: tx.maxPriorityFeePerGas,
    maxFeePerGas: tx.maxFeePerGas,
    data: tx.data,
    nonce: tx.nonce
  }
}

// Helper to assert transaction params
function expectTxParams(actualParams, expectedTx) {
  expect(actualParams.toObject()).to.deep.equal(buildExpectedParams(expectedTx))
}

describe('OperationService', () => {
  before(async () => {
    await mongoose.connect(stageConfig.mongoURI)
    await mongoose.connection.asPromise()
  })

  after(async () => {
    await mongoose.connection.db.dropDatabase()
    await mongoose.connection.close()
  })

  beforeEach(async () => {
    await Operation.deleteMany({})
  })

  function getOperationData(overrides = {}) {
    const defaults = {
      nonce: 123,
      status: 'created',
      data: '0x1234dataTest',
      contractAddress: '0x123',
      batchId: '123',
      type: 'verification',
      txStarted: 123
    }
    const data = { ...defaults, ...overrides }
    // Generate id if not provided
    if (!data.id) {
      data.id = `${data.type}-${data.batchId}-${data.contractAddress}`
    }
    return data
  }

  function expectOperationStructure(operation, expected) {
    expect(operation).to.have.property('id')
    expect(operation.data).to.deep.equal(expected.data)
    expect(operation.nonce).to.equal(expected.nonce)
    expect(operation.status).to.equal(expected.status)
    expect(operation.txStarted).to.equal(expected.txStarted)
    expect(operation.contractAddress).to.equal(expected.contractAddress)
    expect(operation.id).to.equal(`${expected.type}-${expected.batchId}-${expected.contractAddress}`)
    expect(operation.transactions).to.be.an('array').that.is.empty
  }

  describe('create', () => {
    it('should create a new operation', async () => {
      const opData = getOperationData()
      const operation = await OperationService.create(opData)
      expectOperationStructure(operation, opData)
      const found = await Operation.findOne({ id: operation.id })
      expect(found).to.not.be.null
      expect(found.data).to.deep.equal(opData.data)
      expect(found.contractAddress).to.equal(opData.contractAddress)
    })
  })

  describe('findById', () => {
    it('should find operation by id', async () => {
      const opData = getOperationData()
      const created = await OperationService.create(opData)
      const found = await OperationService.findById(created.id)
      expect(found).to.not.be.null
      expect(found.id).to.equal(created.id)
      expect(found.data).to.deep.equal(opData.data)
    })

    it('should return null if operation does not exist', async () => {
      const found = await OperationService.findById('nonexistent-id')
      expect(found).to.be.null
    })
  })

  describe('findPendingTxs', () => {
    it('should find all pending operations', async () => {
      await OperationService.create(getOperationData({ nonce: 1, txStarted: 100, status: 'pending', batchId: 'testBatch' }))
      await OperationService.create(getOperationData({ nonce: 2, txStarted: 100, status: 'completed', batchId: 'testBatch' }))
      await OperationService.create(getOperationData({ nonce: 3, txStarted: 100, status: 'pending', batchId: 'testBatch' }))
      const pending = await OperationService.findPendingTxs()
      expect(pending).to.be.an('array').with.lengthOf(2)
      expect(pending.every(op => op.status === 'pending')).to.be.true
    })
  })

  describe('findByTxHash', () => {
    it('should find operation by transaction hash', async () => {
      const op = await OperationService.create(getOperationData({ nonce: 1, txStarted: 100, batchId: TEST_BATCH_ID }))
      const tx = createTx({ nonce: 1 })
      await OperationService.addTransaction(op.id, tx, TEST_TO_1)
      const found = await OperationService.findByTxHash(TEST_HASH_1)
      expect(found).to.not.be.null
      expect(found.id).to.equal(op.id)
      expect(found.transactions[0]).to.have.property('params')
      expectTxParams(found.transactions[0].params, tx)
    })

    it('should return null if transaction hash not found', async () => {
      const found = await OperationService.findByTxHash('0xnotfound')
      expect(found).to.be.null
    })
  })

  describe('updateStatus', () => {
    it('should update the status of an operation', async () => {
      const op = await OperationService.create(getOperationData({ nonce: 1, txStarted: 100, batchId: 'testBatch' }))
      const updated = await OperationService.updateStatus({ id: op.id, status: 'completed' })
      expect(updated.status).to.equal('completed')
      expect(updated.mined).to.be.true
      const found = await Operation.findOne({ id: op.id })
      expect(found.status).to.equal('completed')
      expect(found.mined).to.be.true
    })
  })

  describe('updateOnTransactionMined', () => {
    it('should update operation on transaction mined', async () => {
      const op = await OperationService.create(getOperationData({ nonce: 1, txStarted: 100, batchId: TEST_BATCH_ID }))
      const tx1 = createTx({ hash: TEST_HASH_1, to: TEST_TO_1 })
      const tx2 = createTx({ hash: TEST_HASH_2, to: TEST_TO_2 })
      await OperationService.addTransaction(op.id, tx1, TEST_TO_1)
      await OperationService.addTransaction(op.id, tx2, TEST_TO_2)
      const receipt = { status: 1, blockNumber: 100 }
      await OperationService.updateOnTransactionMined(op.id, TEST_HASH_1, receipt)
      const found = await Operation.findOne({ id: op.id })
      expect(found.status).to.equal('completed')
      expect(found.mined).to.be.true
      expect(found.txMined).to.equal(100)
      const txStatuses = found.transactions.map(tx => ({ hash: tx.hash, status: tx.status }))
      expect(txStatuses).to.deep.include({ hash: TEST_HASH_1, status: 'completed' })
      expect(txStatuses).to.deep.include({ hash: TEST_HASH_2, status: 'dropped' })
      found.transactions.forEach(tx => {
        expect(tx).to.have.property('params')
      })
    })
  })

  describe('addTransaction', () => {
    it('should add a transaction to an operation', async () => {
      const op = await OperationService.create(getOperationData({ nonce: 1, txStarted: 100, batchId: TEST_BATCH_ID }))
      const tx = createTx({ nonce: 1 })
      const to = TEST_TO_1
      const updated = await OperationService.addTransaction(op.id, tx, to)
      expect(updated.transactions).to.be.an('array').with.lengthOf(1)
      expect(updated.transactions[0].hash).to.equal(TEST_HASH_1)
      expect(updated.transactions[0].params.to).to.equal(to)
      expect(updated.transactions[0].status).to.equal('pending')
      expect(updated.status).to.equal('pending')
      expect(updated.transactions[0]).to.have.property('params')
      expectTxParams(updated.transactions[0].params, tx)
    })
  })
})