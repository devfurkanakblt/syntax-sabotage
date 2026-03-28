import { ethers } from 'hardhat'

async function main() {
  const owner = process.env.POOL_OWNER_ADDRESS

  const [deployer] = await ethers.getSigners()
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
