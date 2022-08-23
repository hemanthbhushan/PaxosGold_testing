const { expect } = require("chai");
const { ethers, network } = require("hardhat");


describe("PAXGImplementation contract",()=>{
    let paxg,owner,signer1,signer2;
    beforeEach(async()=>{
      [owner,signer1,signer2] = await ethers.getSigners();
  
      const PAXG = await ethers.getContractFactory("PAXGImplementation");
      paxg = await PAXG.deploy();
      await paxg.deployed(); 
  
    })
  
    describe("testing PAXG implementation",()=>{
        it("initialize will get reverted",async ()=>{
            //already called in the constructor while deployment 
            expect(paxg.initialize()).to.be.revertedWith("already initialized");
         })
      it("checking symbol and name ",async ()=>{
        const name = await paxg.name();
        const symbol = await paxg.symbol();
        const owner1 = await paxg.owner();

        expect(await paxg.supplyController()).to.equal(owner.address);
        expect(await paxg.feeController()).to.equal(owner.address);
        expect(await paxg.feeRecipient()).to.equal(owner.address);
        expect(owner1).to.equal(owner.address);
        expect(name).to.equal("Paxos Gold");
        expect(symbol).to.equal("PAXG");
    
      })
//----------checking for the transfer(address _to, uint256 _value)

      it("checking the transfer function",async ()=>{
        await paxg.increaseSupply(100);
        expect(await paxg.balanceOf(owner.address)).to.equal(100);
        //initiall when the contract deployed it will be in a pause state only owner can upPause it by using the unpause function
        await paxg.unpause();
        await paxg.transfer(signer1.address,10);
        expect(await paxg.balanceOf(owner.address)).to.equal(90);
        expect(await paxg.balanceOf(signer1.address)).to.equal(10);
      })
      it("checking the transfer function when paused ",async()=>{
        
        // await paxg.pause();
        //initiall when the contract deployed it will be in a pause state 
        expect(paxg.transfer(signer1.address,10)).to.be.revertedWith("whenNotPaused");

      })
      it("checking the transfer function when _to is address(0) ",async ()=>{
        const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
        expect(paxg.transfer(ZERO_ADDRESS,1)).to.be.revertedWith("cannot transfer to address zero");
    })
      
      it("checking the transfer function when frozen",async ()=>{
        await paxg.setAssetProtectionRole(owner.address);
        await paxg.freeze(signer1.address);
        expect(paxg.transfer(signer1.address,10)).to.be.revertedWith("address frozen");
       })
      it("insufficient funds in the msg.sender in transfer function",async()=>{
        expect(paxg.transfer(signer1.address,1)).to.be.revertedWith("insufficient funds");
      }) 

//----------checking for  function transferFrom( address _from, address _to,  uint256 _value)
       
      it("checking for the transfer from function",async ()=>{
        await paxg.increaseSupply(100);
        expect(await paxg.balanceOf(owner.address)).to.equal(100);
        //initiall when the contract deployed it will be in a pause state only owner can upPause it by using the unpause function
        await paxg.unpause();
        //here the _from address should allow the msg.sender certain amount to transfer to the _to by using the approve function
        await paxg.connect(owner).approve(signer1.address,10);
        await paxg.connect(signer1).transferFrom(owner.address,signer2.address,5);

        expect(await paxg.balanceOf(owner.address)).to.equal(95);
        expect(await paxg.balanceOf(signer2.address)).to.equal(5);
        expect(await paxg.allowance(owner.address,signer1.address)).to.equal(5);

    }) 

    it("checking the transferFrom function when paused ",async()=>{
        
        // await paxg.pause();
        //initiall when the contract deployed it will be in a pause state 
        expect(paxg.transferFrom(signer1.address,10)).to.be.revertedWith("whenNotPaused");

      })
      it("checking the transferFrom function when _to is address(0) ",async ()=>{
        const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
        expect(paxg.transferFrom(ZERO_ADDRESS,1)).to.be.revertedWith("cannot transfer to address zero");
    })
      
      it("checking the transferFrom function when frozen",async ()=>{
        await paxg.setAssetProtectionRole(owner.address);
        await paxg.freeze(signer1.address);
        expect(paxg.transferFrom(signer1.address,10)).to.be.revertedWith("address frozen");
       })
      it("insufficient allowance ",async()=>{
        expect(paxg.transferFrom(owner.address,signer2.address,5)).to.be.revertedWith("insufficient allowance");
       
      })

//---------checking for  proposeOwner(address _proposedOwner)

//the existing owner proposing the new owner,now there will we be two address performing some common functions like disregardProposeOwner() 
it("checking the proposeOwner function ",async()=>{
    await paxg.connect(owner).proposeOwner(signer1.address);
    expect(await paxg.proposedOwner()).to.equal(signer1.address);
})
it("checking the proposeOwner function  for onlyOwner,Zero address",async()=>{
    const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
    expect(paxg.connect(signer2).proposeOwner(signer1.address)).to.be.revertedWith("onlyOwner");
    expect(paxg.proposeOwner(ZERO_ADDRESS)).to.be.revertedWith("cannot transfer ownership to address zero");
    await paxg.proposeOwner(signer1.address);
    expect(paxg.connect(signer1).proposeOwner(signer1.address)).to.be.revertedWith("caller already is owner");

})

//------checking for disregardProposeOwner()
//here the proposed owner is removed 
it("checking for disregardProposeOwner()",async()=>{
    const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
    await paxg.connect(owner).proposeOwner(signer1.address);
    expect(await paxg.proposedOwner()).to.equal(signer1.address);
    
    await paxg.connect(signer1).disregardProposeOwner();
    expect(await paxg.proposedOwner()).to.equal(ZERO_ADDRESS);

});
it("checking the require when called by the different address other than owner or proposedOwner",async()=>{
    
    expect(paxg.connect(signer1).disregardProposeOwner()).to.be.revertedWith("only proposedOwner or owner");
    expect(paxg.disregardProposeOwner()).to.be.revertedWith("can only disregard a proposed owner that was previously set");

})
//---checking for the  claimOwnership()
// in this function the proposed owner will claim his position as the new Owner for the contract the old owner will be removed 

it("checking for claimOwnership",async()=>{
    const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
    await paxg.proposeOwner(signer1.address);
    expect(await paxg.owner()).to.equal(owner.address);
    expect(await paxg.proposedOwner()).to.equal(signer1.address);

    await paxg.connect(signer1).claimOwnership();
    expect(await paxg.owner()).to.equal(signer1.address);
    expect(await paxg.proposedOwner()).to.equal(ZERO_ADDRESS);
})
it("checking the claimOwnership for require condition",async()=>{
    expect(paxg.claimOwnership()).to.be.revertedWith("onlyProposedOwner");
})

//----checking for  reclaimPAXG()
//the owner claims all the balance stored in the contract address to the owner address
it("testing the reclaimPAXG",async()=>{
  await paxg.unpause();
  await paxg.increaseSupply(100);
  
  await paxg.transfer(paxg.address,10);
  expect(await paxg.balanceOf(paxg.address)).to.equal(10);

  await paxg.reclaimPAXG();
  expect(await paxg.balanceOf(paxg.address)).to.equal(0);
})
it("checking the reclaimPAXG with require condition",async()=>{
  expect(paxg.connect(signer1).reclaimPAXG()).to.be.revertedWith("onlyOwner")
})

//---checking setAssetProtectionRole(address _newAssetProtectionRole);
//this function is used in the freez function if the account found suspectable
//initialy this will be equal to address(0);
it("check set Asset Protection Role ",async()=>{
  await paxg.setAssetProtectionRole(signer1.address);
  expect(await paxg.assetProtectionRole()).to.equal(signer1.address);

})
it("checking the require condition for set Asset Protection Role ",async()=>{
  expect(paxg.connect(signer1).setAssetProtectionRole(signer2.address)).to.be.revertedWith("only assetProtectionRole or Owner");
})

//-----checking for wipeFrozenAddress(address _addr)
it("test wipe Frozen Address",async()=>{
  await paxg.unpause();
  await paxg.increaseSupply(100);
  await paxg.transfer(signer2.address,10);
  await paxg.setAssetProtectionRole(signer1.address);
  await paxg.connect(signer1).freeze(signer2.address);

  expect(await paxg.balanceOf(signer2.address)).to.equal(10);
  expect(await paxg.totalSupply()).to.equal(100);

  await paxg.connect(signer1).wipeFrozenAddress(signer2.address); 

  expect(await paxg.balanceOf(signer2.address)).to.equal(0);
  expect(await paxg.totalSupply()).to.equal(90);

  expect(await paxg.isFrozen(signer2.address)).to.equal(true);

  await paxg.connect(signer1).unfreeze(signer2.address);
  expect(await paxg.isFrozen(signer2.address)).to.equal(false);

})
//checking the supplyController ,initially owner will be the supplyController if we to change use this function
it("check the supplyController",async()=>{
  await paxg.setSupplyController(signer1.address);
  expect(await paxg.totalSupply()).to.equal(0);

  await paxg.connect(signer1).increaseSupply(1000);
  expect(await paxg.totalSupply()).to.equal(1000);

  await paxg.connect(signer1).decreaseSupply(100);
  expect(await paxg.totalSupply()).to.equal(900);
  

})
it("check the require of the supplyController",async()=>{
  const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
  expect(paxg.connect(signer2).setSupplyController(signer1.address)).to.be.revertedWith("only SupplyController or Owner");
  expect(paxg.setSupplyController(ZERO_ADDRESS)).to.be.revertedWith("only SupplyController or Owner");

})











      
  


     

      


     
      
      
  
    })
  
  
  })