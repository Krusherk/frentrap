const CONTRACT_ADDRESS = "0xeAfdd1577b0f1Ec0Da793c23D98bC8C29774b1f3";
const CONTRACT_ABI = [
  "function startGame() external payable",
  "function pickDoor(uint256 choice, uint256 numDoors) external",
  "function cashOut() external",
  "function withdraw(uint256 amount) external",
  "function resetGame() external", // ✅ added
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
  if (document.getElementById("resetBtn")) // ✅ hook reset button
    document.getElementById("resetBtn").onclick = resetGame;
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

    alert("🚪 Door picked!");
    loadGame();
  } catch (err) {
    console.log(err);

    const doors = document.querySelectorAll(".door");
    if (doors[choice]) {
      doors[choice].classList.add("shake");
      setTimeout(() => doors[choice].classList.remove("shake"), 500);
    }

    alert("💥 Trap! You lost this round. Redirecting to homepage...");
    window.location.href = "index.html"; // ✅ redirect after loss
  }
}

async function cashOut() {
  try {
    let tx = await contract.cashOut();
    await tx.wait();
    alert("💰 Cashed out winnings!");
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

    // ✅ Redirect to homepage after reset
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
        document.getElementById("stage").innerText = player.stage.toString();
      if (document.getElementById("multiplier"))
        document.getElementById("multiplier").innerText = (player.multiplier / 10).toString() + "x";
      if (document.getElementById("winnings"))
        document.getElementById("winnings").innerText = (1 * player.multiplier / 10) + " MON";
      if (document.getElementById("cashOut"))
        document.getElementById("cashOut").style.display = "inline-block";

      renderDoors(player.stage);
    } else {
      if (document.getElementById("stage")) document.getElementById("stage").innerText = "-";
      if (document.getElementById("multiplier")) document.getElementById("multiplier").innerText = "-";
      if (document.getElementById("winnings")) document.getElementById("winnings").innerText = "-";
      const doors = document.getElementById("doors");
      if (doors) doors.innerHTML = "";
      if (document.getElementById("cashOut"))
        document.getElementById("cashOut").style.display = "none";
    }
  } catch (err) {
    console.log("Load game error:", err.message);
  }
}

function renderDoors(stage) {
  const doorsContainer = document.getElementById("doors");
  if (!doorsContainer) return;

  doorsContainer.innerHTML = "";

  let numDoors = Math.floor(Math.random() * 4) + 5;

  for (let i = 0; i < numDoors; i++) {
    const door = document.createElement("div");
    door.classList.add("door");
    door.setAttribute("data-num", i + 1);
    door.onclick = () => pickDoor(i, numDoors);
    doorsContainer.appendChild(door);
  }
}

window.addEventListener("DOMContentLoaded", () => {
  const doorContainer = document.getElementById("doors");
  if (!doorContainer) return;

  const numDoors = 5;
  for (let i = 0; i < numDoors; i++) {
    const door = document.createElement("div");
    door.className = "door";
    door.style.backgroundImage = "url('pindoor.png')";
    door.dataset.index = i;

    door.addEventListener("click", () => {
      const statusEl = document.getElementById("status");
      if (statusEl) statusEl.textContent = `You picked door #${i + 1}`;
      door.classList.add("shake");
      setTimeout(() => door.classList.remove("shake"), 300);
    });

    doorContainer.appendChild(door);
  }
});
