"use client"

import Head from "next/head"
import { useRouter } from "next/router"
import { NextPage } from "next"
import NextImage from "next/image"
import { IoSettings } from "react-icons/io5";
import {
  Box,
  Flex,
  Heading,
  Text,
  VStack,
  HStack,
  Input,
  Button,
  Spinner,
  SimpleGrid,
  BoxProps,
} from "@chakra-ui/react"
import { ConnectButton } from "@rainbow-me/rainbowkit"
import localFont from "next/font/local"
import { ethers } from "ethers"
import { useAccount, useWalletClient } from "wagmi"
import React, { useRef, useState, useEffect } from "react"
import { Icon } from "@chakra-ui/react"
import { HiArrowUp, HiArrowDown } from "react-icons/hi"
import PriceChart, { Snap1 } from "@/components/PriceChart"
import NextLink from "next/link"
import { toaster, Toaster } from "@/components/ui/new_listing_toaster"
import { ToggleTip } from "@/components/ui/toggle-tip"
import collection_abi from "@/web3/collection_abi.json"
import { RPC_ENDPOINT } from "@/web3/config"

const pixel1Font = localFont({ src: "../../fonts/Litebulb 8-bit.ttf" })
const pixelFont = localFont({ src: "../../fonts/Fipps-Regular.otf" })
const pixel3Font = localFont({ src: "../../fonts/PressStart2P-Regular.ttf" })

const GridDots = (props: BoxProps) => (
  <Box
    position="absolute"
    w="120px"
    h="120px"
    {...props}
    style={{
      backgroundImage: "radial-gradient(#ffffff33 1px, transparent 1px)",
      backgroundSize: "20px 20px",
      maskImage: "radial-gradient(white 70%, transparent 100%)",
    }}
  />
)

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))


async function withRetry<T>(fn: () => Promise<T>, retries = 5, baseDelay = 300): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn()
    } catch (err) {
      if (i === retries - 1) throw err
      console.warn(`RPC error: ${err}. Retry ${i + 1}/${retries}`)
      await sleep(baseDelay * 2 ** i)
    }
  }

  throw new Error("withRetry: exhausted") as never
}

const formatTime = (unix: number) =>
  new Date(unix * 1000).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  })

const weiToEth = (b: bigint) => Number(ethers.formatEther(b))

interface Snap {
  t: number
  s: number
  p: number
  isBuy: boolean
  trader: string
}
interface SaleState {
  priceWei: bigint
  price: number
  minted: number
  burned: number
  closed: boolean
}


const TradeListing: NextPage = () => {
  const router = useRouter()
  const listingAddress = router.query.contract as string | undefined
  const ready = Boolean(listingAddress)


  const provider = React.useMemo(() => new ethers.JsonRpcProvider(RPC_ENDPOINT), [])
  const collection = React.useMemo(
    () => (listingAddress ? new ethers.Contract(listingAddress, collection_abi, provider) : null),
    [listingAddress, provider],
  )


  const { address } = useAccount()
  const { data: walletClient } = useWalletClient()


  const [snapData, setSnapData] = React.useState<Snap[]>([])
  const [snaps1, setSnaps1] = React.useState<Snap1[]>([])
  const [saleState, setSaleState] = React.useState<SaleState | null>(null)
  const [listingName, setListingName] = React.useState<string>("")
  const [symbol, setSymbol] = React.useState<string>("")
  const [coverUrl, setCoverUrl] = React.useState<string>("")
  const [loading, setLoading] = React.useState<boolean>(true)
  const [maxSupply, setMaxSupply] = useState<number>(0)
  const [userBalance, setUserBalance] = useState<number>(0)

  const [slippagePct, setSlippagePct] = React.useState<number>(10)
  const [burnTokenId, setBurnTokenId] = React.useState<string>("")

  const [isSlippageOpen, setIsSlippageOpen] = useState(false)
  const slipageToggleOpen = () => setIsSlippageOpen((v) => !v)

  const [ownerAddr, setOwnerAddr] = useState<string>("")
  const [isOwner, setIsOwner] = useState(false)
  const [contractBal, setContractBal] = useState(0)

  const fetchSnaps = React.useCallback(async () => {
    if (!collection) return
    const raw: any[] = await withRetry(() => collection.getRecentSnaps())

    const formatted: Snap[] = raw.map((s) => ({
      t: Number(s.t),
      s: Number(s.s),
      p: weiToEth(s.p),
      isBuy: s.isBuy,
      trader: s.trader,
    }))

    setSnapData(formatted)

    setSnaps1(raw as unknown as Snap1[])
  }, [collection])

  const fetchState = React.useCallback(async () => {
    if (!collection) return
    const [_p, _m, _b, _c] = await withRetry(() => collection.saleState())
    setSaleState({
      priceWei: _p,
      price: Number(ethers.formatEther(_p)),
      minted: Number(_m),
      burned: Number(_b),
      closed: _c,
    })
  }, [collection])

  const fetchMeta = React.useCallback(async () => {
    if (!collection) return
    const [n, s, sup, img, own] = await Promise.all([
      withRetry(() => collection.name()),
      withRetry(() => collection.symbol()),
      withRetry(() => collection.maxSupply()),
      withRetry(() => collection.getImage()),
      withRetry(() => collection.owner()),
    ])
    setListingName(n)
    setSymbol(s)
    setMaxSupply(Number(sup))
    setCoverUrl(img)
    setOwnerAddr(own)
    setIsOwner(address?.toLowerCase() === own.toLowerCase())
    const balWei = await withRetry(() => provider.getBalance(listingAddress as string))
    setContractBal(weiToEth(balWei))
  }, [collection])

  const fetchUserBalance = React.useCallback(async () => {
    if (!collection || !address) return
    const bal: bigint = await withRetry(() => collection.balanceOf(address))
    setUserBalance(Number(bal))
  }, [collection, address])

  React.useEffect(() => {
    if (!collection) return
      ; (async () => {
        setLoading(true)
        await Promise.all([fetchMeta(), fetchSnaps(), fetchState(), fetchUserBalance()])
        setLoading(false)
      })()
    const id = setInterval(() => {
      fetchSnaps()
      fetchState()
      fetchUserBalance()
      fetchMeta()
    }, 3_000)
    return () => clearInterval(id)
  }, [collection, fetchMeta, fetchSnaps, fetchState, fetchUserBalance])

  /* — helper Tx — */
  const signer = React.useMemo(async () => {
    if (!walletClient || !window.ethereum) return null
    const p = new ethers.BrowserProvider(window.ethereum as any)
    return await p.getSigner()
  }, [walletClient])

  /* — BUY — */
  const buy = async () => {
    if (!saleState || !signer || !listingAddress) {
      toaster.create({ title: "Connect wallet first", duration: 3000 })
      return
    }
    try {
      const c = new ethers.Contract(listingAddress, collection_abi, await signer)
      const curWei = BigInt(Math.round(saleState.price * 1e18))
      const maxWei = curWei + (curWei * BigInt(slippagePct)) / 100n + 1n
      const tx = await withRetry(() => c.mint(maxWei, { value: maxWei }))
      toaster.create({ title: "Tx sent", description: "Waiting…" })
      await withRetry(() => tx.wait())
      toaster.create({ title: "Success", description: "Minted" })
    } catch (err: any) {
      console.error(err)
      toaster.create({ title: "Error", description: err.message })
    }
  }

  /* — BURN — */
  const burn = async () => {
    if (!saleState || !signer || !listingAddress) {
      toaster.create({ title: "Connect wallet first", duration: 3000 })
      return
    }
    try {
      const c = new ethers.Contract(listingAddress, collection_abi, await signer)
      const curWei = BigInt(Math.round(saleState.price * 1e18))
      const minWei = curWei - (curWei * BigInt(slippagePct)) / 100n
      const tx = await withRetry(() => c.burnLast(minWei))
      toaster.create({ title: "Tx sent", description: "Waiting…" })
      await withRetry(() => tx.wait())
      toaster.create({ title: "Burned", description: `Token #${burnTokenId}` })
    } catch (err: any) {
      console.error(err)
      toaster.create({ title: "Error", description: err.message })
    }
  }

  /* — OWNER WITHDRAW — */
  const withdraw = async () => {
    if (!signer || !isOwner || !listingAddress) { toaster.create({ title: "Not owner", duration: 3000 }); return }
    if (!saleState?.closed) { toaster.create({ title: "Trading not closed", duration: 3000 }); return }
    try {
      const c = new ethers.Contract(listingAddress, collection_abi, await signer)
      const tx = await withRetry(() => c.withdrawRevenue())
      toaster.create({ title: "Tx sent", description: "Withdrawing…" })
      await withRetry(() => tx.wait())
      toaster.create({ title: "Done", description: "Revenue withdrawn" })
    } catch (err: any) {
      console.error(err)
      toaster.create({ title: "Error", description: err.message })
    }
  }

  /* — PRICE DIRECTION ARROW — */
  const [arrow, setArrow] = useState<"up" | "down" | null>(null)
  const prevWeiRef = useRef<bigint>(0n)

  useEffect(() => {
    if (!saleState) return
    const curWei = saleState.priceWei
    const prevWei = prevWeiRef.current

    if (curWei !== prevWei) {
      setArrow(curWei > prevWei ? "up" : "down")
      const id = setTimeout(() => setArrow(null), 2_000)
      prevWeiRef.current = curWei
      return () => clearTimeout(id)
    }
    prevWeiRef.current = curWei
  }, [saleState?.priceWei])

  /* — PROGRESS BAR — */
  const minted = saleState ? saleState.minted - saleState.burned : 0
  const progress = maxSupply ? (minted / maxSupply) * 100 : 0
  const hue = Math.floor(progress * 1.2)

  /* — LOADING — */
  if (!ready || loading)
    return (
      <Flex bg="black" color="white" minH="100vh" align="center" justify="center">
        <Spinner size="lg" />
      </Flex>
    )

  return (
    <>
      <Head>
        <title>{listingName} | Trade</title>
      </Head>
      <Toaster />

      {isOwner && (
        <Box position="fixed" top={['90px', '100px']} right={[4, 10]} bg="#161616" border="1px solid #c11c84" p={4} borderRadius="md" zIndex={1001} boxShadow="lg">
          <Text fontSize="sm" mb={2} className={pixel3Font.className}>Oh, seems you are owner…</Text>
          <Text fontSize="xs" className={pixel3Font.className}>NFTs left: {maxSupply - minted}</Text>
          <Text fontSize="xs" className={pixel3Font.className}>Pool balance: {contractBal.toFixed(4)} MON</Text>
          <Text fontSize="2xs" color="gray.400" mb={2} className={pixel3Font.className}>10 % goes to project pool</Text>
          <Button size="xs" w="full" variant="outline" borderColor="#c11c84" onClick={withdraw} disabled={!saleState?.closed} className={pixel3Font.className}>withdraw</Button>
        </Box>
      )}

      {saleState?.closed && (
        <Box position="fixed" bottom="0" left="0" w="full" h="50%" bg="blackAlpha.700" display="flex" alignItems="center" justifyContent="center" zIndex={900} backdropFilter="blur(2px)">
          <VStack gap={3} textAlign="center">
            <Heading fontSize={["lg", "2xl"]} className={pixelFont.className}>Mint auction finished</Heading>
            <Text fontSize="sm" className={pixel3Font.className}>Continue trading on secondary market:</Text>
            <NextLink href={`https://magiceden.io/item-details/${listingAddress}`} passHref legacyBehavior>
              <Button size="sm" bg="#c11c84" _hover={{ bg: "#e055ab" }} className={pixel3Font.className}>View on Magic Eden</Button>
            </NextLink>
          </VStack>
        </Box>
      )}

      <Box bg="black" color="white" minH="100vh" px={4} pt={4} position="relative">

        <GridDots top={[6, 10]} left={[4, 10]} />
        <GridDots top={[6, 10]} right={[4, 10]} />
        <GridDots bottom={[6, 10]} left={[4, 10]} />
        <GridDots bottom={[6, 10]} right={[4, 10]} />

        <Flex as="nav" w={["full", "70%"]} maxW="6xl" mx="auto" mb={10} px={[0, 4]} pt={3} align="center" justify="space-between">
          <NextLink href="/" passHref>
            <Heading
              fontSize={["5xl"]}
              letterSpacing="wider"
              fontWeight="bold"
              className={pixel1Font.className}
            >
              <Text as="span" color="#c11c84">
                pic
              </Text>
              pool
            </Heading>
          </NextLink>
          <ConnectButton
            chainStatus="icon"
            accountStatus="address"
            showBalance={true}
          />
        </Flex>
        <Flex direction="column" align="center">
          <Flex justify="center" direction="column" gap={10}>
            <VStack gap={10}>
              <Heading fontSize={["4xl"]} className={pixelFont.className}>
                {listingName}
              </Heading>
            </VStack>
            <Flex justify="center" align="center" gap={0} w="full" direction={"column"}>
              <NextImage
                src={coverUrl}
                alt={listingName}
                width={256}
                height={256}
                style={{ objectFit: "cover", border: "2px solid #c11c84" }}
              />
              <NextLink href={`https://magiceden.io/collections/monad-testnet/${listingAddress}`} passHref>
                <Text fontSize="2xs" as="span" color="gray.800" className={pixel3Font.className}>secondary market</Text>
              </NextLink></Flex>
            <Text fontSize="2xl" color="white" className={pixel3Font.className} textAlign="center">
              {saleState?.price.toFixed(4)} MON
            </Text>
            <HStack w="full" justify="center">
              {arrow ? (
                <Icon
                  as={arrow === "up" ? HiArrowUp : HiArrowDown}
                  color={arrow === "up" ? "green.300" : "red.300"}
                  boxSize="4"
                />
              ) : " "}
              {arrow ? (
                <Icon
                  as={arrow === "up" ? HiArrowUp : HiArrowDown}
                  color={arrow === "up" ? "green.300" : "red.300"}
                  boxSize="4"
                />
              ) : " "}
              {arrow ? (
                <Icon
                  as={arrow === "up" ? HiArrowUp : HiArrowDown}
                  color={arrow === "up" ? "green.300" : "red.300"}
                  boxSize="4"
                />
              ) : <Icon as={HiArrowUp} opacity="0" boxSize="4" />}</HStack>
          </Flex>
        </Flex>

        <Flex direction="column" align="center" maxW="6xl" mx="auto" gap={12}>

          <SimpleGrid columns={[1, 1, 2]} gap={10} w="full">
            <Box w="100%" pr={[0, 8]}>
              <VStack>
                <Flex justify="flex-end" w="full">
                  <Flex align="center" gap={2}>



                  </Flex>
                </Flex>
                <PriceChart snaps={snaps1} color="pink.solid" label="MON" />

              </VStack>
            </Box>

            <VStack justify="center" align="center" gap={4} p={6} w="70%">
              <Flex w="100%" direction="column" justify="space-between">

                <Flex justify="space-between" align="center">

                  <Text fontSize="2xs" color="gray.400" className={pixel3Font.className}>
                    You own: <Text as="span" color="#c11c84">{userBalance} ${symbol}</Text>
                  </Text>

                  <Text textAlign="right" fontSize="2xs" color="gray.400" className={pixel3Font.className}>
                    <ToggleTip content={<Flex p={2} justify="center" align="center">
                      <Text fontSize="2xs" className={pixel3Font.className}>Slippage: </Text>
                      <Input
                        w="50%"
                        type="number"
                        h="24px"
                        fontSize="2xs"
                        value={slippagePct}
                        onChange={(e) => setSlippagePct(Number(e.target.value))}
                        border="1px solid #c11c84"
                        className={pixel3Font.className}
                        outline="none"
                        _focus={{ outline: "none" }}
                      /></Flex>
                    }>
                      <Button variant="ghost" bg="transparent" onClick={slipageToggleOpen}>
                        <Icon as={IoSettings} boxSize="4" color="#c11c84" />
                      </Button>
                    </ToggleTip>



                  </Text>


                </Flex>

              </Flex>




              <HStack w="full">
                <Button w="50%"
                  variant="outline"
                  onClick={buy}
                  color="green.600"
                  border="1px solid #c11c84"
                  className={pixel3Font.className}
                >
                  buy
                </Button>

                <Button w="50%"
                  variant="outline"
                  border="1px solid #c11c84"
                  onClick={burn}
                  color="red.600"
                  className={pixel3Font.className}
                >
                  sell
                </Button>
              </HStack>
              <Text fontSize="2xs" color="gray.400" className={pixel3Font.className}>
                Market price: ~{saleState?.price.toFixed(4)} MON
              </Text>

            </VStack>
          </SimpleGrid>

          <VStack w="60%" gap={2}>
            <Box w="full" h="8px" bg="#161616" overflow="hidden">
              <Box
                h="full"
                width={`${progress}%`}
                style={{
                  background: `
          repeating-linear-gradient(
            90deg,
            #c11c84 0px 8px,            /* рожевий блок 8 px */
            transparent 8px 12px        /* 2-px проміжок */
          )
        `,
                  imageRendering: "pixelated",
                }}
              />
            </Box>

            <Flex justify="space-between" w="full">
              <Text fontSize="2xs" className={pixel3Font.className}>
                {minted}/{maxSupply}
              </Text>
              <Text fontSize="2xs" className={pixel3Font.className}>
                {progress.toFixed(1)} %
              </Text>
            </Flex>
          </VStack>

          <Box w="60%" p={4}>
            <Heading fontSize="sm" mb={1} className={pixel3Font.className}>
              Recent trades
            </Heading>

            <VStack align="stretch" maxH="260px" overflowY="auto" gap={2} p={5} css={{

              "&::-webkit-scrollbar": { width: "4px" },
              "&::-webkit-scrollbar-track": { background: "transparent" },
              "&::-webkit-scrollbar-thumb": {
                background: "#c11c84",
                borderRadius: "9999px",
              },
              "&::-webkit-scrollbar-thumb:hover": {
                background: "#e055ab",
              },

              scrollbarWidth: "thin",
              scrollbarColor: "#c11c84 transparent",
            }}>
              {snapData
                .slice(-20)
                .reverse()
                .map((s, i) => {
                  const fade = i >= 15
                    ? 0.4 - (i - 15) * 0.1
                    : 1;
                  return (
                    <HStack
                      key={`${s.t}-${i}`}
                      justify="space-between"
                      fontSize="2xs"
                      opacity={fade}
                      className={pixel3Font.className}
                    >
                      <Text>{formatTime(s.t)}</Text>

                      <Text color={s.isBuy ? "green.300" : "red.300"}>
                        {s.isBuy ? "▲" : "▼"} {s.p.toFixed(4)} MON
                      </Text>

                      <Text fontSize="2xs">
                        {s.trader.slice(0, 6)}…{s.trader.slice(-4)}
                      </Text>
                    </HStack>
                  )
                })}
            </VStack>
          </Box>
        </Flex>
      </Box>
    </>
  )
}

export default TradeListing
