import { ethers } from 'hardhat'

async function main() {
  const owner = process.env.POOL_OWNER_ADDRESS

  const signers = await ethers.getSigners()
  const deployer = signers[0]

  if (!deployer) {
    throw new Error(
      'No deployer signer found. Check DEPLOYER_PRIVATE_KEY in contracts/.env.example (hex key, with or without 0x).',
    )
  }

  if (owner && owner.trim().length > 0 && !ethers.isAddress(owner.trim())) {
    throw new Error('POOL_OWNER_ADDRESS is not a valid EVM address.')
  }

  const ownerAddress = owner && owner.trim().length > 0 ? owner : deployer.address

  const factory = await ethers.getContractFactory('SyntaxSabotagePool')
  const contract = await factory.deploy(ownerAddress)
  await contract.waitForDeployment()

  const address = await contract.getAddress()
  console.log(`SyntaxSabotagePool deployed to: ${address}`)
  console.log(`Pool owner: ${ownerAddress}`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
