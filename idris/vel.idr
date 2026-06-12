-- Module Vel
-- Part of VEL Cryptography & Protection Engine
--
-- Formal Specification in the Idris Dependently Typed Language.
-- Enforces compile-time dimension constraints and structural
-- correctness for the Echo State Network and XOR One-Time Pad.

module Vel

import Data.Vect

--------------------------------------------------------------------------------
-- 1. Dimension Definitions (Dependent Constants)
--------------------------------------------------------------------------------

InputSize : Nat
InputSize = 64

ReservoirSize : Nat
ReservoirSize = 128

-- State vectors enforced to be exactly of length 128
ReservoirState : Type
ReservoirState = Vect ReservoirSize Double

-- Input vectors enforced to be exactly of length 64
InputVector : Type
InputVector = Vect InputSize Double

-- Matrix dimensions enforced at compile time
-- e.g. Matrix m n represents an m-row by n-column matrix
Matrix : Nat -> Nat -> Type
Matrix m n = Vect m (Vect n Double)

--------------------------------------------------------------------------------
-- 2. Type-Safe Linear Algebra
--------------------------------------------------------------------------------

-- Dot product of two vectors of identical length
dotProduct : Vect len Double -> Vect len Double -> Double
dotProduct xs ys = sum (zipWith (*) xs ys)

-- Matrix-vector multiplication
-- Enforces that the vector's length matches the matrix's column dimension at compile-time.
-- Returns a vector matching the matrix's row dimension.
matrixMultiply : {rows : Nat} -> {cols : Nat} 
               -> Matrix rows cols 
               -> Vect cols Double 
               -> Vect rows Double
matrixMultiply mats vec = map (\row => dotProduct row vec) mats

--------------------------------------------------------------------------------
-- 3. Spatiotemporal LSM Reservoir Step
--------------------------------------------------------------------------------

postulate tanh : Double -> Double

-- Leaky Integrate-and-Fire Echo State update step
-- The compiler guarantees that:
--   - input weight dimensions match input vector size
--   - recurrent weights match reservoir state size
--   - bias, current state, and output state sizes are identical
lsmUpdate : (alpha : Double)
         -> (win : Matrix ReservoirSize InputSize)
         -> (wres : Matrix ReservoirSize ReservoirSize)
         -> (bias : ReservoirState)
         -> (u : InputVector)
         -> (x : ReservoirState)
         -> ReservoirState
lsmUpdate alpha win wres bias u x =
  let inputExcitation = matrixMultiply win u
      recurrentExcitation = matrixMultiply wres x
      totalExcitation = zipWith (+) (zipWith (+) inputExcitation recurrentExcitation) bias
      activated = map tanh totalExcitation
  in zipWith (\prev, act => (1.0 - alpha) * prev + alpha * act) x activated

--------------------------------------------------------------------------------
-- 4. Cryptographic Proof (One-Time Pad Self-Inverse)
--------------------------------------------------------------------------------

-- Abstract bitwise XOR operation
postulate xorByte : Bits8 -> Bits8 -> Bits8

-- Axiom: XOR is its own inverse
postulate xorSelfInverse : (a : Bits8) -> (b : Bits8) -> xorByte (xorByte a b) b = a

-- One-Time Pad Encryption
encryptOTP : Vect n Bits8 -> Vect n Bits8 -> Vect n Bits8
encryptOTP msg key = zipWith xorByte msg key

-- One-Time Pad Decryption
decryptOTP : Vect n Bits8 -> Vect n Bits8 -> Vect n Bits8
decryptOTP cipher key = zipWith xorByte cipher key

-- Theorem: Decrypting a ciphertext with the correct key recovers the original message.
-- Checked and verified at compile-time using dependent types.
otpCorrect : (msg : Vect n Bits8) -> (key : Vect n Bits8) -> decryptOTP (encryptOTP msg key) key = msg
otpCorrect [] [] = Refl
otpCorrect (m :: ms) (k :: ks) = 
  -- By structural induction on Vect:
  -- We know xorByte (xorByte m k) k = m (from xorSelfInverse)
  -- and decryptOTP (encryptOTP ms ks) ks = ms (from inductive hypothesis)
  let inductiveStep = otpCorrect ms ks
      currentStep = xorSelfInverse m k
  in cong2 (::) currentStep inductiveStep
