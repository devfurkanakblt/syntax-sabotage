import { expect } from 'chai'
import { ethers } from 'hardhat'

describe('SyntaxSabotagePool', function () {
  it('allows participants to join and owner to finalize payouts', async function () {
    const [owner, playerA, playerB] = await ethers.getSigners()

    const factory = await ethers.getContractFactory('SyntaxSabotagePool')
    const pool = await factory.deploy(owner.address)
    await pool.waitForDeployment()

    const matchId = ethers.keccak256(ethers.toUtf8Bytes('LOBBY_ABCD'))
    const entryFee = ethers.parseEther('0.01')

    await pool.createMatchPool(matchId, entryFee)
    await pool.connect(playerA).joinMatch(matchId, { value: entryFee })
    await pool.connect(playerB).joinMatch(matchId, { value: entryFee })

    await expect(pool.finalizeMatch(matchId, [playerA.address]))
      .to.changeEtherBalances([playerA], [ethers.parseEther('0.02')])
  })

  it('rejects non-participant winner list', async function () {
    const [owner, playerA, outsider] = await ethers.getSigners()

    const factory = await ethers.getContractFactory('SyntaxSabotagePool')
    const pool = await factory.deploy(owner.address)
    await pool.waitForDeployment()

    const matchId = ethers.keccak256(ethers.toUtf8Bytes('LOBBY_EFGH'))
    const entryFee = ethers.parseEther('0.01')

    await pool.createMatchPool(matchId, entryFee)
    await pool.connect(playerA).joinMatch(matchId, { value: entryFee })

    await expect(pool.finalizeMatch(matchId, [outsider.address]))
      .to.be.revertedWith('WINNER_NOT_PARTICIPANT')
  })
})
