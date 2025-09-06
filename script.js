const CONTRACT_ADDRESS = "0xeAfdd1577b0f1Ec0Da793c23D98bC8C29774b1f3";
const CONTRACT_ABI = [
  "function startGame() external payable",
  "function pickDoor(uint256 choice, uint256 numDoors) external",
  "function cashOut() external",
  "function withdraw(uint256 amount) external",
  "function resetGame() external",
  "function players(address) view returns (uint256 stage, uint256 multiplier, bool active)",
  "function owner() view returns (address)"
];

let provider, signer, contract, userAddress, ownerAddress;
const { ethers } = window;

window.addEventListener("load", async () => {
  if (localStorage.getItem("connected") === "true") {
    await connectWallet();
  }

  if (document.getElementById("connectBtn"))
    document.getElementById("connectBtn").onclick = connectWallet;
  if (document.getElementById("startBtn"))
    document.getElementById("startBtn").onclick = startGame;
  if (document.getElementById("cashOut"))
    document.getElementById("cashOut").onclick = cashOut;
  if (document.getElementById("withdrawBtn"))
    document.getElementById("withdrawBtn").onclick = withdrawFunds;
  if (document.getElementById("resetBtn"))
    document.getElementById("resetBtn").onclick = resetGame;
  if (document.getElementById("claimBtn"))
    document.getElementById("claimBtn").onclick = cashOut; // claim button = cashOut

  // ✅ On page load, just check game state
  loadGame();
});

async function connectWallet() {
  if (!window.ethereum) {
    alert("❌ Please install MetaMask!");
    return;
  }
  try {
    provider = new ethers.BrowserProvider(window.ethereum);
    signer = await provider.getSigner();
    userAddress = await signer.getAddress();

    contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
    ownerAddress = await contract.owner();

    localStorage.setItem("connected", "true");
    localStorage.setItem("userAddress", userAddress);

    const walletStatus = document.getElementById("walletStatus");
    if (walletStatus) {
      walletStatus.innerText = `✅ Connected: ${userAddress.slice(0, 6)}...${userAddress.slice(-4)}`;
    }

    if (document.getElementById("startBtn"))
      document.getElementById("startBtn").disabled = false;

    if (userAddress.toLowerCase() === ownerAddress.toLowerCase()) {
      if (document.getElementById("ownerPanel")) {
        document.getElementById("ownerPanel").style.display = "block";
        loadHouseBalance();
      }
    }

    loadGame();
  } catch (err) {
    console.error(err);
    alert("Connection failed: " + err.message);
  }
}

async function startGame() {
  if (!contract) {
    alert("⚠️ Please connect your wallet first!");
    return;
  }
  try {
    let player = await contract.players(userAddress);

    if (player.active) {
      if (confirm("⚠️ You already have an active game. Do you want to reset it first?")) {
        await resetGame();
      } else {
        return;
      }
    }

    let tx = await contract.startGame({
      value: ethers.parseEther("1.0"),
      gasLimit: 300000n
    });

    alert("📤 Transaction submitted. Please confirm in MetaMask...");
    await tx.wait();

    alert("🎮 Game started!");
    window.location.href = "game.html";
  } catch (err) {
    console.error("Start game failed:", err);
    alert("Start game failed: " + (err.reason || err.message));
  }
}

async function pickDoor(choice, numDoors) {
  try {
    let tx = await contract.pickDoor(choice, numDoors);
    await tx.wait();

    alert("🚪 Safe! Proceeding...");

    // ✅ Reload game state after tx confirmation
    await loadGame();
  } catch (err) {
    console.log(err);
    alert("💥 Trap! Game Over. Redirecting to homepage...");
    await resetGame();
  }
}

async function cashOut() {
  try {
    let tx = await contract.cashOut();
    await tx.wait();
    alert("💰 Cashed out winnings!");

    const doors = document.getElementById("doors");
    if (doors) doors.innerHTML = "";
    if (document.getElementById("claimBtn"))
      document.getElementById("claimBtn").style.display = "none";

    await loadGame();
  } catch (err) {
    alert("Error: " + err.message);
  }
}

async function withdrawFunds() {
  try {
    let balance = await provider.getBalance(CONTRACT_ADDRESS);
    let tx = await contract.withdraw(balance);
    await tx.wait();
    alert("🏦 Withdraw successful!");
    loadHouseBalance();
  } catch (err) {
    alert("Error: " + err.message);
  }
}

async function resetGame() {
  try {
    let tx = await contract.resetGame();
    await tx.wait();
    alert("🔄 Game reset!");

    await loadGame();
    window.location.href = "index.html";
  } catch (err) {
    console.error(err);
    alert("Reset failed: " + (err.reason || err.message));
  }
}

async function loadHouseBalance() {
  if (!provider) return;
  let balance = await provider.getBalance(CONTRACT_ADDRESS);
  const el = document.getElementById("houseBalance");
  if (el) el.innerText = ethers.formatEther(balance) + " MON";
}

async function loadGame() {
  if (!contract) return;

  try {
    let player = await contract.players(userAddress);

    if (player.active) {
      if (document.getElementById("stage"))
        document.getElementById("stage").innerText = Number(player.stage).toString();
      if (document.getElementById("multiplier"))
        document.getElementById("multiplier").innerText =
          (Number(player.multiplier) / 10).toString() + "x";
      if (document.getElementById("winnings"))
        document.getElementById("winnings").innerText =
          (Number(player.multiplier) / 10) + " MON";

      if (document.getElementById("cashOut"))
        document.getElementById("cashOut").style.display = "inline-block";

      if (document.getElementById("claimBtn"))
        document.getElementById("claimBtn").style.display = "inline-block";

      // ✅ Render doors based on the actual stage from contract
      renderDoors(Number(player.stage));
    } else {
      if (document.getElementById("stage"))
        document.getElementById("stage").innerText = "-";
      if (document.getElementById("multiplier"))
        document.getElementById("multiplier").innerText = "-";
      if (document.getElementById("winnings"))
        document.getElementById("winnings").innerText = "-";

      const doors = document.getElementById("doors");
      if (doors) doors.innerHTML = "";

      if (document.getElementById("cashOut"))
        document.getElementById("cashOut").style.display = "none";
      if (document.getElementById("claimBtn"))
        document.getElementById("claimBtn").style.display = "none";
    }
  } catch (err) {
    console.log("Load game error:", err.message);
  }
}

function renderDoors(stage) {
  const doorsContainer = document.getElementById("doors");
  if (!doorsContainer) return;

  doorsContainer.innerHTML = "";

  let numDoors = Math.floor(Math.random() * 4) + 5; // 5–8 doors

  for (let i = 0; i < numDoors; i++) {
    const door = document.createElement("div");
    door.classList.add("door");
    door.style.backgroundImage = "url('pindoor.png')";
    door.setAttribute("data-num", i + 1);

    door.onclick = async () => {
      const allDoors = document.querySelectorAll(".door");
      allDoors.forEach(d => (d.style.pointerEvents = "none"));

      door.classList.add("shake");
      setTimeout(() => door.classList.remove("shake"), 500);

      await pickDoor(i, numDoors); // contract decides trap vs safe
    };

    doorsContainer.appendChild(door);
  }
}
