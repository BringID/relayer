/* eslint-disable */
const { expect } = require('chai')
const { Interface } = require('ethers')
const proxyquire = require('proxyquire')
const sinon = require('sinon')
const { BadRequestError } = require('../src/utils/errors')
const airdropErrorsABI = require('../contracts/airdrop-errors.json')
const semaphoreErrorsABI = require('../contracts/semaphore-errors.json')
const registryErrorsABI = require('../contracts/registry-errors.json')

describe('ErrorParser', () => {
  let errorParser
  let loggerStub
  let airdropIface
  let semaphoreIface
  let registryIface

  before(() => {
    airdropIface = new Interface(airdropErrorsABI)
    semaphoreIface = new Interface(semaphoreErrorsABI)
    registryIface = new Interface(registryErrorsABI)
  })

  beforeEach(() => {
    // Mock logger
    loggerStub = {
      info: sinon.stub(),
      warn: sinon.stub(),
      error: sinon.stub()
    }

    // Load error parser with mocked logger
    const ErrorParserModule = proxyquire('../src/utils/error-parser', {
      './logger': loggerStub
    })

    // Get the singleton instance
    errorParser = ErrorParserModule
  })

  afterEach(() => {
    sinon.restore()
  })

  describe('parseContractError', () => {
    describe('when error data is missing', () => {
      it('should throw SIMULATION_CALL_FAILED when error has no data', () => {
        const err = {
          reason: 'Some reason',
          message: 'Some message'
        }

        expect(() => {
          errorParser.parseContractError(err, 'airdrop')
        }).to.throw(BadRequestError, 'Error simulating transaction call')

        expect(loggerStub.warn.calledOnce).to.be.true
        expect(loggerStub.warn.firstCall.args[0]).to.include('Error simulating transaction')
      })

      it('should throw SIMULATION_CALL_FAILED when error is null', () => {
        const err = null

        expect(() => {
          errorParser.parseContractError(err, 'airdrop')
        }).to.throw(BadRequestError, 'Error simulating transaction call')
      })
    })

    describe('registry custom errors', () => {
      it('should parse AlreadyRegistered error from registry (err.data)', () => {
        const errorData = registryIface.encodeErrorResult('AlreadyRegistered', [])
        const err = { data: errorData }

        expect(() => {
          errorParser.parseContractError(err, 'airdrop')
        }).to.throw(BadRequestError)

        try {
          errorParser.parseContractError(err, 'airdrop')
        } catch (error) {
          expect(error).to.be.instanceOf(BadRequestError)
          expect(error.cause).to.equal('ALREADY_REGISTERED')
          expect(error.message).to.equal('Credential already registered')
        }
      })

      it('should parse AttestationExpired error from registry', () => {
        const errorData = registryIface.encodeErrorResult('AttestationExpired', [])
        const err = { data: errorData }

        expect(() => {
          errorParser.parseContractError(err, 'airdrop')
        }).to.throw(BadRequestError)

        try {
          errorParser.parseContractError(err, 'airdrop')
        } catch (error) {
          expect(error.cause).to.equal('ATTESTATION_EXPIRED')
          expect(error.message).to.equal('Attestation expired')
        }
      })

      it('should parse WrongChain error from registry', () => {
        const errorData = registryIface.encodeErrorResult('WrongChain', [])
        const err = { data: errorData }

        try {
          errorParser.parseContractError(err, 'airdrop')
        } catch (error) {
          expect(error.cause).to.equal('WRONG_CHAIN')
          expect(error.message).to.equal('Wrong chain')
        }
      })

      it('should parse InvalidCommitment error from registry', () => {
        const errorData = registryIface.encodeErrorResult('InvalidCommitment', [])
        const err = { data: errorData }

        try {
          errorParser.parseContractError(err, 'airdrop')
        } catch (error) {
          expect(error.cause).to.equal('INVALID_COMMITMENT')
          expect(error.message).to.equal('Invalid commitment')
        }
      })

      it('should parse ScopeMismatch error from registry', () => {
        const errorData = registryIface.encodeErrorResult('ScopeMismatch', [])
        const err = { data: errorData }

        try {
          errorParser.parseContractError(err, 'airdrop')
        } catch (error) {
          expect(error.cause).to.equal('SCOPE_MISMATCH')
          expect(error.message).to.equal('Scope mismatch')
        }
      })

      it('should parse RecoveryPending error when contractName is registry', () => {
        const errorData = registryIface.encodeErrorResult('RecoveryPending', [])
        const err = { data: errorData }

        try {
          errorParser.parseContractError(err, 'registry')
        } catch (error) {
          expect(error.cause).to.equal('RECOVERY_PENDING')
          expect(error.message).to.equal('Recovery is pending')
        }
      })
    })

    describe('when error data exists and can be parsed', () => {
      it('should parse AirdropClaimed error correctly', () => {
        const testAddress = '0x1234567890123456789012345678901234567890'
        const errorData = airdropIface.encodeErrorResult('AirdropClaimed', [testAddress])
        const err = { data: errorData }

        expect(() => {
          errorParser.parseContractError(err, 'airdrop')
        }).to.throw(BadRequestError)

        try {
          errorParser.parseContractError(err, 'airdrop')
        } catch (error) {
          expect(error).to.be.instanceOf(BadRequestError)
          expect(error.cause).to.equal('AIRDROP_ALREADY_CLAIMED')
          expect(error.message).to.include(testAddress)
          expect(loggerStub.warn.called).to.be.true
        }
      })

      it('should parse AirdropStopped error correctly', () => {
        const errorData = airdropIface.encodeErrorResult('AirdropStopped', [])
        const err = { data: errorData }

        expect(() => {
          errorParser.parseContractError(err, 'airdrop')
        }).to.throw(BadRequestError)

        try {
          errorParser.parseContractError(err, 'airdrop')
        } catch (error) {
          expect(error).to.be.instanceOf(BadRequestError)
          expect(error.cause).to.equal('AIRDROP_STOPPED')
          expect(error.message).to.equal('Airdrop is currently stopped')
        }
      })

      it('should parse AmountIsZero error correctly', () => {
        const errorData = airdropIface.encodeErrorResult('AmountIsZero', [])
        const err = { data: errorData }

        expect(() => {
          errorParser.parseContractError(err, 'airdrop')
        }).to.throw(BadRequestError)

        try {
          errorParser.parseContractError(err, 'airdrop')
        } catch (error) {
          expect(error).to.be.instanceOf(BadRequestError)
          expect(error.cause).to.equal('AMOUNT_IS_ZERO')
          expect(error.message).to.equal('Amount is zero')
        }
      })

      it('should parse InsufficientScore error correctly', () => {
        const testScore = 100n
        const errorData = airdropIface.encodeErrorResult('InsufficientScore', [testScore])
        const err = { data: errorData }

        expect(() => {
          errorParser.parseContractError(err, 'airdrop')
        }).to.throw(BadRequestError)

        try {
          errorParser.parseContractError(err, 'airdrop')
        } catch (error) {
          expect(error).to.be.instanceOf(BadRequestError)
          expect(error.cause).to.equal('INSUFFICIENT_SCORE')
          expect(error.message).to.include('100')
          expect(error.message).to.include('Insufficient score')
        }
      })

      it('should parse ThresholdIsZero error correctly', () => {
        const errorData = airdropIface.encodeErrorResult('ThresholdIsZero', [])
        const err = { data: errorData }

        expect(() => {
          errorParser.parseContractError(err, 'airdrop')
        }).to.throw(BadRequestError)

        try {
          errorParser.parseContractError(err, 'airdrop')
        } catch (error) {
          expect(error).to.be.instanceOf(BadRequestError)
          expect(error.cause).to.equal('THRESHOLD_IS_ZERO')
          expect(error.message).to.equal('Threshold is zero')
        }
      })

      it('should parse TransferFailed error correctly', () => {
        const errorData = airdropIface.encodeErrorResult('TransferFailed', [])
        const err = { data: errorData }

        expect(() => {
          errorParser.parseContractError(err, 'airdrop')
        }).to.throw(BadRequestError)

        try {
          errorParser.parseContractError(err, 'airdrop')
        } catch (error) {
          expect(error).to.be.instanceOf(BadRequestError)
          expect(error.cause).to.equal('TRANSFER_FAILED')
          expect(error.message).to.equal('Token transfer failed')
        }
      })

      it('should handle error data from err.error.data', () => {
        const testAddress = '0x1234567890123456789012345678901234567890'
        const errorData = airdropIface.encodeErrorResult('AirdropClaimed', [testAddress])
        const err = {
          error: {
            data: errorData
          }
        }

        expect(() => {
          errorParser.parseContractError(err, 'airdrop')
        }).to.throw(BadRequestError)

        try {
          errorParser.parseContractError(err, 'airdrop')
        } catch (error) {
          expect(error.cause).to.equal('AIRDROP_ALREADY_CLAIMED')
        }
      })

      describe('semaphore errors', () => {
        it('should parse LeafAlreadyExists error when contractName is semaphore', () => {
          const errorData = semaphoreIface.encodeErrorResult('LeafAlreadyExists', [])
          const err = { data: errorData }

          expect(() => {
            errorParser.parseContractError(err, 'semaphore')
          }).to.throw(BadRequestError)

          try {
            errorParser.parseContractError(err, 'semaphore')
          } catch (error) {
            expect(error).to.be.instanceOf(BadRequestError)
            expect(error.cause).to.equal('LEAF_ALREADY_EXISTS')
            expect(error.message).to.equal('Leaf already exists in the Merkle tree')
          }
        })

        it('should parse Semaphore__InvalidProof error when contractName is semaphore', () => {
          const errorData = semaphoreIface.encodeErrorResult('Semaphore__InvalidProof', [])
          const err = { data: errorData }

          expect(() => {
            errorParser.parseContractError(err, 'semaphore')
          }).to.throw(BadRequestError)

          try {
            errorParser.parseContractError(err, 'semaphore')
          } catch (error) {
            expect(error).to.be.instanceOf(BadRequestError)
            expect(error.cause).to.equal('INVALID_PROOF')
            expect(error.message).to.equal('Invalid Semaphore proof')
          }
        })

        it('should fallback to semaphore errors when contractName is airdrop', () => {
          const errorData = semaphoreIface.encodeErrorResult('Semaphore__GroupDoesNotExist', [])
          const err = { data: errorData }

          expect(() => {
            errorParser.parseContractError(err, 'airdrop')
          }).to.throw(BadRequestError)

          try {
            errorParser.parseContractError(err, 'airdrop')
          } catch (error) {
            expect(error).to.be.instanceOf(BadRequestError)
            expect(error.cause).to.equal('GROUP_DOES_NOT_EXIST')
            expect(error.message).to.equal('Group does not exist')
          }
        })
      })
    })

    describe('when error cannot be parsed', () => {
      it('should throw SIMULATION_CALL_FAILED when parseError returns null', () => {
        // Create invalid error data (wrong selector)
        const errorData = '0x12345678' + '0'.repeat(64)
        const err = { data: errorData }

        expect(() => {
          errorParser.parseContractError(err, 'airdrop')
        }).to.throw(BadRequestError, 'Error simulating transaction call')

        expect(loggerStub.warn.called).to.be.true
      })

      it('should throw SIMULATION_CALL_FAILED when error data is malformed', () => {
        const errorData = '0xinvalid'
        const err = { data: errorData }

        expect(() => {
          errorParser.parseContractError(err, 'airdrop')
        }).to.throw(BadRequestError, 'Error simulating transaction call')
      })

      it('should throw SIMULATION_CALL_FAILED when error data exists but no interface can parse it', () => {
        const err = {
          data: '0x12345678' + '0'.repeat(64),
          reason: 'execution reverted'
        }

        expect(() => {
          errorParser.parseContractError(err, 'airdrop')
        }).to.throw(BadRequestError, 'Error simulating transaction call')

        expect(loggerStub.warn.called).to.be.true
      })
    })

    describe('contractName is ignored (always try all interfaces)', () => {
      it('should parse valid error data even when contractName is unknown', () => {
        const testAddress = '0x1234567890123456789012345678901234567890'
        const errorData = airdropIface.encodeErrorResult('AirdropClaimed', [testAddress])
        const err = { data: errorData }

        try {
          errorParser.parseContractError(err, 'unknown-contract')
        } catch (error) {
          expect(error).to.be.instanceOf(BadRequestError)
          expect(error.cause).to.equal('AIRDROP_ALREADY_CLAIMED')
          expect(error.message).to.include(testAddress)
        }
      })
    })

    describe('when error is not in ERROR_MAPPING', () => {
      it('should throw CONTRACT_ERROR for unmapped error', () => {
        // Create a mock interface that returns an unknown error
        const mockIface = {
          parseError: sinon.stub().returns({
            name: 'UnknownError',
            args: [],
            signature: 'UnknownError()'
          })
        }

        // Replace the interface temporarily
        const originalInterface = errorParser.interfaces.airdrop
        errorParser.interfaces.airdrop = mockIface

        const err = { data: '0x1234' }

        expect(() => {
          errorParser.parseContractError(err, 'airdrop')
        }).to.throw(BadRequestError)

        try {
          errorParser.parseContractError(err, 'airdrop')
        } catch (error) {
          expect(error.cause).to.equal('CONTRACT_ERROR')
          expect(error.message).to.include('UnknownError')
          expect(loggerStub.warn.called).to.be.true
        } finally {
          // Restore original interface
          errorParser.interfaces.airdrop = originalInterface
        }
      })
    })

    describe('default contract name', () => {
      it('should use "airdrop" as default contract name', () => {
        const testAddress = '0x1234567890123456789012345678901234567890'
        const errorData = airdropIface.encodeErrorResult('AirdropClaimed', [testAddress])
        const err = { data: errorData }

        expect(() => {
          errorParser.parseContractError(err) // No contract name provided
        }).to.throw(BadRequestError)

        try {
          errorParser.parseContractError(err)
        } catch (error) {
          expect(error.cause).to.equal('AIRDROP_ALREADY_CLAIMED')
        }
      })
    })
  })
})

