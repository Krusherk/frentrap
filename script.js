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
      alert("⚠️ You already have an active game. Redirecting...");
      window.location.href = "game.html";
      return;
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
    loadGame();
  } catch (err) {
    console.log(err);
    alert("💥 Trap! Game Over. Redirecting to homepage...");
    window.location.href = "index.html";
  }
}

async function cashOut() {
  try {
    let tx = await contract.cashOut();
    await tx.wait();
    alert("💰 Cashed out winnings!");

    // hide doors after cashout
    const doors = document.getElementById("doors");
    if (doors) doors.innerHTML = "";
    if (document.getElementById("claimBtn"))
      document.getElementById("claimBtn").style.display = "none";
    loadGame();
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
if (player.active) {
  if (document.getElementById("cashOut"))
    document.getElementById("cashOut").style.display = "inline-block"; // ✅ always show claim

  try {
    let player = await contract.players(userAddress);

    if (player.active) {
      if (document.getElementById("stage"))
        document.getElementById("stage").innerText = player.stage.toString();
      if (document.getElementById("multiplier"))
        document.getElementById("multiplier").innerText = (player.multiplier / 10).toString() + "x";
      if (document.getElementById("winnings"))
        document.getElementById("winnings").innerText = (1 * player.multiplier / 10) + " MON";

      // show claim button only after stage >= 2
      if (document.getElementById("claimBtn")) {
        if (player.stage >= 2) {
          document.getElementById("claimBtn").style.display = "inline-block";
        } else {
          document.getElementById("claimBtn").style.display = "none";
        }
      }

      renderDoors(player.stage);
    } else {
      if (document.getElementById("stage")) document.getElementById("stage").innerText = "-";
      if (document.getElementById("multiplier")) document.getElementById("multiplier").innerText = "-";
      if (document.getElementById("winnings")) document.getElementById("winnings").innerText = "-";
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

  // 🎯 Pick 3 unique traps
  let traps = new Set();
  while (traps.size < 3) {
    traps.add(Math.floor(Math.random() * numDoors));
  }

  for (let i = 0; i < numDoors; i++) {
    const door = document.createElement("div");
    door.classList.add("door");
    door.style.backgroundImage = "url('pindoor.png')";
    door.setAttribute("data-num", i + 1);

    door.onclick = async () => {
      // disable doors while processing
      const allDoors = document.querySelectorAll(".door");
      allDoors.forEach(d => (d.style.pointerEvents = "none"));

      door.classList.add("shake");
      setTimeout(() => door.classList.remove("shake"), 500);

      if (traps.has(i)) {
        alert("💥 Oh no! That was a trap door. Game Over.");
        await resetGame();
      } else {
        alert(`🎉 Safe! You cleared Stage ${stage}.`);
        await pickDoor(i, numDoors);   // advance stage on-chain
        await loadGame();              // 🔑 refresh doors + show claim
      }
    };

    doorsContainer.appendChild(door);
  }
}

// Initial door render for stage 1
window.addEventListener("DOMContentLoaded", () => {
  renderDoors(1);
});
