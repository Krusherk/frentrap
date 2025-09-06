const CONTRACT_ADDRESS = "0x830082F0d900F650CCaCdaa595B4d3b020373921";
const CONTRACT_ABI = [
  "function startGame() external payable",
  "function pickDoor(uint256 choice, uint256 numDoors) external",
  "function cashOut() external",
  "function withdraw(uint256 amount) external",
  "function players(address) view returns (uint256 stage, uint256 multiplier, bool active)",
  "function owner() view returns (address)"
];

let provider, signer, contract, userAddress, ownerAddress;

window.addEventListener("load", async () => {
  if (localStorage.getItem("connected") === "true") {
    await connectWallet();
  }

  if (document.getElementById("connectBtn")) {
    document.getElementById("connectBtn").onclick = connectWallet;
  }
  if (document.getElementById("startBtn")) {
    document.getElementById("startBtn").onclick = startGame;
  }
  if (document.getElementById("cashOut")) {
    document.getElementById("cashOut").onclick = cashOut;
  }
  if (document.getElementById("withdrawBtn")) {
    document.getElementById("withdrawBtn").onclick = withdrawFunds;
  }
});

async function connectWallet() {
  if (!window.ethereum) {
    alert("❌ Please install MetaMask!");
    return;
  }
  await ethereum.request({ method: "eth_requestAccounts" });
  provider = new ethers.providers.Web3Provider(window.ethereum);
  signer = provider.getSigner();
  userAddress = await signer.getAddress();

  contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
  ownerAddress = await contract.owner();

  localStorage.setItem("connected", "true");
  localStorage.setItem("userAddress", userAddress);

  alert("✅ Wallet connected: " + userAddress);

  if (document.getElementById("startBtn")) {
    document.getElementById("startBtn").disabled = false;
  }

  if (userAddress.toLowerCase() === ownerAddress.toLowerCase()) {
    if (document.getElementById("ownerPanel")) {
      document.getElementById("ownerPanel").style.display = "block";
      loadHouseBalance();
    }
  }

  loadGame();
}

async function startGame() {
  try {
    let tx = await contract.startGame({ value: ethers.utils.parseEther("1") });
    await tx.wait();
    alert("🎮 Game started!");
    window.location.href = "game.html";
  } catch (err) {
    alert("Error: " + err.message);
  }
}

async function pickDoor(choice, numDoors) {
  try {
    let tx = await contract.pickDoor(choice, numDoors);
    await tx.wait();
    alert("🚪 Door picked!");
    loadGame();
  } catch (err) {
    alert("Error: " + err.message);
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

async function loadHouseBalance() {
  if (!provider) return;
  let balance = await provider.getBalance(CONTRACT_ADDRESS);
  document.getElementById("houseBalance").innerText =
    ethers.utils.formatEther(balance) + " MON";
}

async function loadGame() {
  if (!contract) return;

  try {
    let player = await contract.players(userAddress);

    if (player.active) {
      if (document.getElementById("stage")) {
        document.getElementById("stage").innerText = player.stage.toString();
        document.getElementById("multiplier").innerText =
          (player.multiplier / 10).toString() + "x";
        document.getElementById("winnings").innerText =
          (1 * player.multiplier / 10) + " MON";
        document.getElementById("cashOut").style.display = "inline-block";
        renderDoors(player.stage);
      }
    } else {
      if (document.getElementById("stage")) {
        document.getElementById("stage").innerText = "-";
        document.getElementById("multiplier").innerText = "-";
        document.getElementById("winnings").innerText = "-";
        document.getElementById("doors").innerHTML = "";
        document.getElementById("cashOut").style.display = "none";
      }
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
    door.innerText = i + 1;
    door.onclick = () => pickDoor(i, numDoors);
    doorsContainer.appendChild(door);
  }
}
