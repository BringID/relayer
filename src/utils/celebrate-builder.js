const { celebrate, Joi, Segments } = require('celebrate')

const celebrateMiddleware = celebrateSchema => {
  if (celebrateSchema === 'executeOperation') {
    return celebrate({
      [Segments.HEADERS]: Joi.object({
        customer: Joi.string().optional().messages({
          'string.empty': 'CUSTOMER_HEADER_REQUIRED',
          'any.required': 'CUSTOMER_HEADER_REQUIRED'
        })
      }).unknown(true),
      [Segments.BODY]: Joi.object().keys({
        sender: Joi.string().required().messages({
          'string.base': 'SENDER_FIELD_WRONG_TYPE',
          'string.empty': 'SENDER_FIELD_REQUIRED',
          'any.required': 'SENDER_FIELD_REQUIRED'
        }),
        transfer_id: Joi.string().required().messages({
          'string.base': 'TRANSFER_ID_WRONG_TYPE',
          'string.empty': 'TRANSFER_ID_REQUIRED',
          'any.required': 'TRANSFER_ID_REQUIRED'
        }),
        token: Joi.string().required().messages({
          'string.base': 'TOKEN_WRONG_TYPE',
          'string.empty': 'TOKEN_REQUIRED',
          'any.required': 'TOKEN_REQUIRED'
        }),
        token_type: Joi.string().required().messages({
          'string.base': 'TOKEN_TYPE_WRONG_TYPE',
          'string.empty': 'TOKEN_TYPE_REQUIRED',
          'any.required': 'TOKEN_TYPE_REQUIRED'
        }),
        escrow: Joi.string().required().messages({
          'string.base': 'LINKDROP_ESCROW_FIELD_WRONG_TYPE',
          'string.empty': 'LINKDROP_ESCROW_FIELD_REQUIRED',
          'any.required': 'LINKDROP_ESCROW_FIELD_REQUIRED'
        }),
        expiration: Joi.alternatives().try(
          Joi.string(),
          Joi.number()
        ).messages({
          'alternatives.types': 'EXPIRATION_WRONG_TYPE',
          'any.required': 'EXPIRATION_REQUIRED'
        }),
        amount: Joi.string().required().messages({
          'string.base': 'AMOUNT_WRONG_TYPE',
          'string.empty': 'AMOUNT_REQUIRED',
          'any.required': 'AMOUNT_REQUIRED'
        }),
        hash: Joi.string().optional().messages({
          'string.base': 'HASH_WRONG_TYPE',
          'string.empty': 'HASH_REQUIRED',
          'any.required': 'HASH_REQUIRED'
        }),
        tx_hash: Joi.string().optional().messages({
          'string.base': 'TX_HASH_WRONG_TYPE',
          'string.empty': 'TX_HASH_REQUIRED',
          'any.required': 'TX_HASH_REQUIRED'
        }),
        total_amount: Joi.string().required().messages({
          'string.base': 'TOTAL_AMOUNT_WRONG_TYPE',
          'string.empty': 'TOTAL_AMOUNT_REQUIRED',
          'any.required': 'TOTAL_AMOUNT_REQUIRED'
        }),
        fee_amount: Joi.string().required().messages({
          'string.base': 'FEE_AMOUNT_WRONG_TYPE',
          'string.empty': 'FEE_AMOUNT_REQUIRED',
          'any.required': 'FEE_AMOUNT_REQUIRED'
        }),
        fee_token: Joi.string().required().messages({
          'string.base': 'FEE_TOKEN_WRONG_TYPE',
          'string.empty': 'FEE_TOKEN_REQUIRED',
          'any.required': 'FEE_TOKEN_REQUIRED'
        }),
        fee_authorization: Joi.string().required().messages({
          'string.base': 'FEE_AUTHORIZATION_WRONG_TYPE',
          'string.empty': 'FEE_AUTHORIZATION_REQUIRED',
          'any.required': 'FEE_AUTHORIZATION_REQUIRED'
        }),
        transaction_type: Joi.string().optional().valid('tx', 'userOp').messages({
          'string.base': 'TRANSACTION_TYPE_WRONG_TYPE',
          'string.empty': 'TRANSACTION_TYPE_REQUIRED',
          'any.required': 'TRANSACTION_TYPE_REQUIRED'
        }),
        encrypted_sender_message: Joi.string().optional().messages({
          'string.base': 'ENCRYPTED_SENDER_MESSAGE_WRONG_TYPE',
          'string.empty': 'ENCRYPTED_SENDER_MESSAGE_REQUIRED',
          'any.required': 'ENCRYPTED_SENDER_MESSAGE_REQUIRED'
        })
      })
    }, { abortEarly: false, mode: 'FULL' })
  }
}

module.exports = { celebrateMiddleware }
