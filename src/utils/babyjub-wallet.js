import { eddsa } from 'circomlib'

import * as eddsaBabyJub from './eddsa-babyjub'
import { buildTransactionHashMessage } from './tx-utils'
import { hashBuffer } from './utils'

/**
 * Manage Babyjubjub keys
 * Perform standard wallet actions
 */
export class BabyJubWallet {
  /**
     * Initialize Babyjubjub wallet from private key
     * @param {Buffer} privateKey - 32 bytes buffer
     * @param {String} hermezEthereumAddress - Hexadecimal string containing the public Ethereum key from Metamask
     */
  constructor (privateKey, hermezEthereumAddress) {
    const priv = new eddsaBabyJub.PrivateKey(privateKey)
    const pub = priv.public()

    this.privateKey = privateKey
    this.publicKey = [pub.p[0].toString(), pub.p[1].toString()]
    this.publicKeyHex = [pub.p[0].toString(16), pub.p[1].toString(16)]
    this.publicKeyCompressed = pub.compress().toString()
    this.publicKeyCompressedHex = pub.compress().toString(16)
    this.hermezEthereumAddress = hermezEthereumAddress
  }

  /**
     * Signs message with private key
     * @param {String} messageStr - message to sign
     * @returns {String} - Babyjubjub signature packed and encoded as an hex string
     */
  signMessage (messageStr) {
    const messBuff = Buffer.from(messageStr)
    const messHash = hashBuffer(messBuff)
    const privKey = new eddsaBabyJub.PrivateKey(this.privateKey)
    const sig = privKey.signPoseidon(messHash)
    return sig.toString('hex')
  }

  /**
   * To sign transaction with babyjubjub keys
   * @param {Object} tx -transaction
   */
  signTransaction (transaction, encodedTransaction) {
    const hashMessage = buildTransactionHashMessage(encodedTransaction)
    const signature = eddsa.signPoseidon(this.privateKey, hashMessage)
    const packedSignature = eddsa.packSignature(signature)
    transaction.signature = packedSignature.toString('hex')
    return transaction
  }
}

/**
 * Verifies signature for a given message using babyjubjub
 * @param {String} publicKeyHex - Babyjubjub public key encoded as hex string
 * @param {String} messStr - clear message data
 * @param {String} signatureHex - Ecdsa signature compresed and encoded as hex string
 * @returns {boolean} True if validation is succesfull; otherwise false
 */
export function verifyBabyJub (publicKeyHex, messStr, signatureHex) {
  const pkBuff = Buffer.from(publicKeyHex, 'hex')
  const pk = eddsaBabyJub.PublicKey.newFromCompressed(pkBuff)
  const msgBuff = Buffer.from(messStr)
  const hash = hashBuffer(msgBuff)
  const sigBuff = Buffer.from(signatureHex, 'hex')
  const sig = eddsaBabyJub.Signature.newFromCompressed(sigBuff)
  return pk.verifyPoseidon(hash, sig)
}
