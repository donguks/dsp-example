// 테스트 환경에 맞는 주소를 설정해야하고, 메타마스크는 해당 네트워크가 선택되어있어야 합니다.

// 용어 설명
// - Vault = 하나의 적금 계좌
// - DSP_BOOTSTRAP = Vault를 생성하는 컨트랙트
// - ALCHEMY_API_ADDRESS = 알케미 API 주소. ethereum 노드를 제공해주는 서비스입니다. https://www.alchemy.com/에서 가입하고, 사용하는 체인에 맞게 key를 생성하면됩니다.
//

const DSP_ADDRESS = "0x7439E9Bb6D8a84dd3A23fe621A30F95403F87fB9"; // ERC20
const MACH_ADDRESS = "0xc21d97673B9E0B3AA53a06439F71fDc1facE393B"; // ERC20
const DSP_BOOTSTRAP_ADDRESS = "0x8d6B92A796ce9AE90480C502b8E0c89BF48e6B3f";
const ALCHEMY_API_ADDRESS = "https://eth-sepolia.g.alchemy.com/v2/API_KEY";

const provider = new ethers.providers.JsonRpcProvider(ALCHEMY_API_ADDRESS);

// Address로 Vaults 조회하기
async function getVaults(address) {
  const contract = new ethers.Contract(
    DSP_BOOTSTRAP_ADDRESS,
    [
      "function nextVaultId(address owner) view returns (uint nextVaultId)",
      "function vault(address owner, uint256 id) view returns (tuple(uint amount, uint depositTs, bool active))",
    ],
    provider
  );

  const nextId = await contract.nextVaultId(address);
  let max = nextId.toNumber();

  const vaults = await Promise.all([
    ...Array(max)
      .fill()
      .map((_, i) => contract.vault(address, i)),
  ]);

  console.log(vaults);
  // 3. Claim 가능한 토큰 계산하기.
}

async function getAllownace(address) {
  const contract = new ethers.Contract(
    MACH_ADDRESS,
    [
      "function allowance(address owner, address spender) view returns (uint allownace)",
    ],
    provider
  );

  return contract.allowance(address, DSP_BOOTSTRAP_ADDRESS);
}
async function getMachBalance(address) {
  const contract = new ethers.Contract(
    MACH_ADDRESS,
    ["function balanceOf(address owner) view returns (uint balance)"],
    provider
  );

  return contract.balanceOf(address);
}
async function approve(amount, signer) {
  const contract = new ethers.Contract(
    MACH_ADDRESS,
    ["function approve(address spender, uint256 amount) returns (bool res)"],
    signer
  );

  return contract.approve(DSP_BOOTSTRAP_ADDRESS, amount);
}

async function deposit(amount, signer) {
  const contract = new ethers.Contract(
    DSP_BOOTSTRAP_ADDRESS,
    ["function deposit(uint256 amount) returns (bool res)"],
    signer
  );

  return contract.deposit(amount);
}

async function claim(id, signer) {
  const contract = new ethers.Contract(
    DSP_BOOTSTRAP_ADDRESS,
    ["function claim(uint256 id) returns (bool res)"],
    signer
  );

  return contract.claim(id);
}

// 코드 사용 예시
window.onload = async () => {
  console.group("window.onload");
  if (!window.ethereum) {
    console.log("MetaMask를 설치해주세요.");
    return;
  }

  const walletProvider = new ethers.providers.Web3Provider(window.ethereum);
  await walletProvider.send("eth_requestAccounts", []); // 메타마스크 연결
  const signer = walletProvider.getSigner();
  const userAddress = await signer.getAddress();

  // --------------
  console.group("조회하기");
  // --------------
  console.group("MACH 잔액 조회하기");
  const machBalance = await getMachBalance(userAddress);
  console.log(machBalance.toString()); // Decimal이 18이므로 매우 긴 문자열
  console.log(ethers.utils.formatEther(machBalance)); // Decimal이 18을 보기 좋게 변환, 만약 decimal이 6이라면 formatUnits(machBalance, 6)을 사용하면 됩니다.
  console.groupEnd();

  console.group("MACH Allowance 조회하기");
  // - Allowance = DSP_Bootstrap 컨트랙트가 사용자로부터 얼마나 많은 MACH를 사용할 수 있는지에 대한 값
  // - Allowance가 1이라면,
  const allowance = await getAllownace(userAddress);
  console.log(ethers.utils.formatEther(allowance)); // allownace도 decimal이 18이므로 formatEther를 사용하면 됩니다.
  console.groupEnd();

  console.group("Vault 조회하기");
  try {
    const vaults = await getVaults(userAddress);
    console.log(vaults);
  } catch {}
  console.groupEnd();
  console.groupEnd();

  /*
  console.group("Approve 실행");
  try {
    // 100000000 MACH를 approve합니다.
    const tx = approve(ethers.utils.parseEther("100000000"), signer);
    // 만약 트랜잭션을 만든다면, tx.wait() 을 실행해서, 트랜잭션이 완료되기를 기다릴 수 있습니다.
    // https://docs.ethers.org/v5/api/providers/types/#providers-TransactionResponse 에서 wait() 참고
    await tx.wait();
  } catch (e) {
    // 실행할 수 없는 트랜잭션 또는 유저가 취소한 경우
    console.log("실행 취소");
  }
  console.groupEnd();
  */

  // -------
  console.group("예치하기");
  // -------
  // 예치를 하기 위해서는, allownace >= amount 여야합니다.
  // 만약 allownace가 부족하다면, approve를 실행해야합니다.
  //
  try {
    // 100MACH를 Deposit합니다.
    const tx = deposit(ethers.utils.parseEther("100"), signer);
    await tx.wait();
  } catch (e) {
    console.log("실행 취소");
  }
  console.groupEnd();

  /*
  // -------
  console.group("출금하기");
  // -------
  try {
    // signer의 id=0 vault를 출금합니다.
    const tx = claim(0, signer);
    await tx.wait();
    console.log(tx);
  } catch (e) {
    console.log("실행 취소");
  }
  console.groupEnd();
  */

  console.groupEnd();
};
