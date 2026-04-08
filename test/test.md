# DApp iframe 集成测试指南

## 目标

验证 DApp 正确嵌入到 Ring Wallet 的 iframe 中，且 `window.ethereum` provider 工作正常。

## 前提条件

DApp 已部署且可在钱包中访问，或本地开发服务器已运行。

---

## 方法一：浏览器 Console 测试

打开浏览器 DevTools（按 F12 或 Cmd+Option+I），切换到 **Console** 面板。

### 1. 先进入 DApp iframe 自己的 Console

如果你现在打开的是 `wallet.ring.exchange` 的 Console，那么默认执行上下文通常是钱包主页面，不是 iframe 里的 DApp。

要切换到 iframe 里的 DApp 上下文：

1. 打开 DevTools 的 **Console**
2. 在 Console 顶部找到 **JavaScript context** 下拉框
3. 默认一般显示为 `top`、`wallet.ring.exchange` 或类似主页面上下文
4. 切换到你的 DApp 对应的 frame，通常会显示为 DApp 的域名或 iframe 的 URL

切换完成后，这个 Console 里的 `window` 就是 iframe 内 DApp 的 `window`。

### 2. 为什么不能直接在钱包主页面 Console 里看 DApp 变量

如果 DApp 和 `wallet.ring.exchange` 不是同源，浏览器的同源策略会限制你直接从顶层页面读取 iframe 内部变量。

也就是说，在钱包主页面 Console 里你可以做：

```javascript
document.querySelector("iframe")
```

但通常不能稳定地直接做：

```javascript
document.querySelector("iframe").contentWindow.ethereum
```

因为这往往会受到跨域限制。

所以最正确的方式不是在顶层 Console 里硬取 iframe 变量，而是把 Console 的执行上下文切换到 iframe 本身。

### 3. 验证是否已经在 iframe 上下文中

切到 iframe 对应的 Console 后执行：

```javascript
console.log("是否在 iframe 中:", window.self !== window.top);
console.log("parent === top:", window.parent === window.top);
console.log("当前页面 URL:", window.location.href);
console.log("当前页面 origin:", window.location.origin);
```

**预期结果：**
- `是否在 iframe 中: true`
- `parent === top: true` 或父层关系符合当前嵌套结构
- `当前页面 URL` 是 DApp 自己的地址，不是 `wallet.ring.exchange`

### 4. 验证 window.ethereum provider

```javascript
// 检查 provider 是否存在
console.log("ethereum provider:", window.ethereum);

// 检查 provider 类型
console.log("is Ring Wallet:", window.ethereum?.isRingWallet);
console.log("is MetaMask:", window.ethereum?.isMetaMask);
```

**预期结果：**
- `ethereum provider: RingWalletProvider {...}`
- `is Ring Wallet: true`

### 5. 测试 eth_accounts（获取钱包地址）

```javascript
// 获取当前连接的地址
window.ethereum.request({ method: "eth_accounts" })
  .then(accounts => console.log("accounts:", accounts))
  .catch(err => console.error("error:", err));
```

**预期结果：** 返回包含钱包地址的数组，如 `["0x1234...abcd"]`

### 6. 测试 eth_chainId（获取链 ID）

```javascript
window.ethereum.request({ method: "eth_chainId" })
  .then(chainId => console.log("chainId:", chainId))
  .catch(err => console.error("error:", err));
```

**预期结果：** 返回当前链的 ID，如 `"0xaa36a7"`（Sepolia）

### 7. 监听 events

```javascript
// 监听 accountsChanged 事件
window.ethereum.on("accountsChanged", (accounts) => {
  console.log("accounts changed:", accounts);
});

// 监听 chainChanged 事件
window.ethereum.on("chainChanged", (chainId) => {
  console.log("chain changed:", chainId);
});
```

### 8. 检查当前 DApp 的嵌入状态和钱包状态

```javascript
console.log("href =", window.location.href);
console.log("in iframe =", window.self !== window.top);
console.log("ethereum exists =", !!window.ethereum);
console.log("isRingWallet =", window.ethereum?.isRingWallet);

await window.ethereum.request({ method: "eth_accounts" });
await window.ethereum.request({ method: "eth_chainId" });
```

你主要看这几个结论：

- `in iframe = true`，说明当前 Console 已经进入 DApp iframe
- `ethereum exists = true`，说明钱包 provider 已注入
- `isRingWallet = true`，说明当前 provider 是 Ring Wallet
- `eth_accounts` 返回的第一个地址，就是当前连接的钱包地址
- `eth_chainId` 返回的是当前连接链

### 9. 手动触发 handshake（调试用）

dappsdk.js 会自动发送 handshake，但如果需要调试：

```javascript
// 手动发送 handshake 消息
window.parent.postMessage({
  type: "ring_wallet_handshake",
  version: "1.0.0"
}, "*");
```

---

## 方法二：使用 dappsdk.js 提供的调试信息

dappsdk.js 初始化时会打印调试信息到 Console：

```
[Ring Wallet] DApp SDK v1.0.0 initialized (iframe mode)
```

查看方法：在 Console 中向上滚动查找此消息。

如果你切换到了 iframe Console，还可以继续执行：

```javascript
window.ethereum.request({ method: "eth_accounts" }).then(console.log)
window.ethereum.request({ method: "eth_chainId" }).then(console.log)
```

如果这里能直接拿到地址和链 ID，就说明 iframe 内 DApp 和钱包的注入、握手、provider 基本都正常。

---

## 方法三：网页显示状态（推荐）

当前 DApp 的 `ChainFaucetPicker` 组件已显示钱包连接状态：

- **读取中…** — 正在获取钱包信息
- **未检测到钱包** — `window.ethereum` 不可用
- **未连接（eth_accounts 为空）** — 钱包未连接
- **0x1234...abcd** — 已连接，显示地址

打开 Faucet 时观察 `${ADDRESS}` 是否被正确替换。

---

## 方法四：本地模拟 iframe 环境

如果本地开发需要模拟钱包环境，可以使用 `ringwallet-sim.html`：

1. 启动 DApp 开发服务器：`npm run dev`
2. 在浏览器中打开 `/public/ringwallet-sim.html`
3. DApp 会作为 iframe 嵌入，由 sim.html 模拟钱包

---

## 常见问题排查

| 问题 | 可能原因 | 解决方法 |
|------|----------|----------|
| 只有一个 Console，不知道怎么进 iframe | 还在顶层页面上下文 | 在 Console 顶部切换 JavaScript context 到 DApp iframe |
| 在钱包 Console 里访问 `iframe.contentWindow.xxx` 报错 | 跨域限制 | 不要从顶层硬取，直接切换到 iframe 的执行上下文 |
| `ethereum` 为 `undefined` | SDK 未加载 | 检查 dappsdk.js 是否正确引入 |
| `eth_accounts` 返回空数组 | 钱包未连接 | 在钱包中连接 DApp |
| handshake 消息未收到 | iframe 配置问题 | 确认 parent window 是钱包 |
| `accountsChanged` 不触发 | 事件监听未注册 | 确保使用 `provider.on()` |

---

## 生产环境测试

1. 将 DApp 部署到可公开访问的域名
2. 在钱包设置中配置 DApp URL
3. 在钱包中打开 DApp
4. 重复上述 Console 测试步骤
