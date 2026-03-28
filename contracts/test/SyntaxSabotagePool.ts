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

  it('mints non-transferable debugger badges for crewmate code-fix win', async function () {
    const [owner, playerA, playerB] = await ethers.getSigners()

    const factory = await ethers.getContractFactory('SyntaxSabotagePool')
    const pool = await factory.deploy(owner.address)
    await pool.waitForDeployment()

    const matchId = ethers.keccak256(ethers.toUtf8Bytes('LOBBY_IJKL'))
    const entryFee = ethers.parseEther('0.01')

    await pool.createMatchPool(matchId, entryFee)
    await pool.connect(playerA).joinMatch(matchId, { value: entryFee })
    await pool.connect(playerB).joinMatch(matchId, { value: entryFee })

    await pool.finalizeMatchAndMintCrewBadge(matchId, [playerA.address, playerB.address], 0)

    expect(await pool.ownerOf(1)).to.equal(playerA.address)
    expect(await pool.ownerOf(2)).to.equal(playerB.address)
    expect(await pool.badgeTypeOf(1)).to.equal(0)
    expect(await pool.badgeTypeOf(2)).to.equal(0)

    await expect(pool.connect(playerA).transferFrom(playerA.address, owner.address, 1))
      .to.be.revertedWith('SOULBOUND')
  })

  it('mints de-impostorer badges for crewmate imposter-detection win', async function () {
    const [owner, playerA] = await ethers.getSigners()

    const factory = await ethers.getContractFactory('SyntaxSabotagePool')
    const pool = await factory.deploy(owner.address)
    await pool.waitForDeployment()

    const matchId = ethers.keccak256(ethers.toUtf8Bytes('LOBBY_MNOP'))
    const entryFee = ethers.parseEther('0.01')

    await pool.createMatchPool(matchId, entryFee)
    await pool.connect(playerA).joinMatch(matchId, { value: entryFee })

    await pool.finalizeMatchAndMintCrewBadge(matchId, [playerA.address], 1)

    expect(await pool.badgeTypeOf(1)).to.equal(1)
    const tokenUri = await pool.tokenURI(1)
    expect(tokenUri).to.contain('data:application/json;utf8,')
    expect(tokenUri).to.contain('de-impostorer')
    expect(tokenUri).to.contain('http://localhost:3000/nft-images/de-impostorer.png')
  })

  it('supports owner-only demo minting without requiring pool setup', async function () {
    const [owner, playerA, playerB, outsider] = await ethers.getSigners()

    const factory = await ethers.getContractFactory('SyntaxSabotagePool')
    const pool = await factory.deploy(owner.address)
    await pool.waitForDeployment()

    await pool.mintDemoCrewBadges([playerA.address, playerB.address], 0)

    expect(await pool.ownerOf(1)).to.equal(playerA.address)
    expect(await pool.ownerOf(2)).to.equal(playerB.address)
    expect(await pool.badgeTypeOf(1)).to.equal(0)
    expect(await pool.badgeTypeOf(2)).to.equal(0)

    const tokenUri = await pool.tokenURI(1)
    expect(tokenUri).to.contain('http://localhost:3000/nft-images/debugger.png')

    await expect(pool.connect(outsider).mintDemoCrewBadges([outsider.address], 1)).to.be.revertedWithCustomError(
      pool,
      'OwnableUnauthorizedAccount',
    )
  })
})
