import { NextPage } from "next";
import Head from "next/head";
import {
  Box,
  Flex,
  Heading,
  Text,
  VStack,
  HStack,
  SimpleGrid,
  Button,
  Link as ChakraLink,
  BoxProps
} from "@chakra-ui/react";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import localFont from "next/font/local";
import NextImage from "next/image";
import NextLink from "next/link";
import { useRouter } from "next/router";

import { Toaster, toaster } from "@/components/ui/new_listing_toaster"

const pixelFont = localFont({ src: "../fonts/Fipps-Regular.otf" });
const pixel1Font = localFont({ src: "../fonts/Litebulb 8-bit.ttf" });
const pixel3Font = localFont({ src: "../fonts/PressStart2P-Regular.ttf" });
const pixel4Font = localFont({ src: "../fonts/test.ttf" });

import { ethers } from "ethers";
import factory_abi from "../web3/factory_abi.json";
import collection_abi from "../web3/collection_abi.json";

import { FACTORY_ADDRESS, RPC_ENDPOINT } from "../web3/config";

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
);


interface Listing {
  img: any;
  name: string;
  symbol: string;
  desc: string;
  price: number;
  updated: number;
  contract: string;
  supplyTotal: number;
  supplySold: number;
  isNew: boolean;
  progress: number;
  supply: number;
}

import { Tooltip } from "@/components/ui/tooltip"
import React from "react";

const filters = [
  { key: "all", label: "all" },
  { key: "new", label: "new" },
  { key: "almost", label: "almost" },
  { key: "sold", label: "sold" },
];

const Trade: NextPage = () => {
  const provider = React.useMemo(
    () => new ethers.JsonRpcProvider(RPC_ENDPOINT),
    [],
  );

  const factory = React.useMemo(
    () => new ethers.Contract(FACTORY_ADDRESS, factory_abi, provider),
    [provider],
  );

  const [listings, setListings] = React.useState<Listing[]>([]);
  const [lastParsedId, setLastParsedId] = React.useState(0);
  const isFirstLoad = React.useRef(true);

  const withRetry = async <T,>(
    fn: () => Promise<T>,
    attempts = 3,
    delayMs = 500,
  ): Promise<T> => {
    let lastErr: unknown;
    for (let i = 0; i < attempts; i++) {
      try {
        return await fn();
      } catch (err) {
        lastErr = err;
        if (i < attempts - 1) {
          await new Promise((r) => setTimeout(r, delayMs * 2 ** i));
        }
      }
    }
    throw lastErr;
  };


  const fetchListings = React.useCallback(async () => {
    try {
      const next = Number(await withRetry(() => factory.nextListingId()));

      if (next <= lastParsedId) return;

      const addresses = await Promise.all(
        Array.from({ length: next - lastParsedId }, (_, k) =>
          withRetry(() => factory.listings(lastParsedId + k)),
        ),
      );

      const results = await Promise.allSettled(
        addresses.map(async (addr) => {
          const col = new ethers.Contract(addr, collection_abi, provider)
          const [list, maxSup] = await Promise.all([
            withRetry(() => col.listing()),
            withRetry(() => col.maxSupply()),
          ])

          const minted = Number(list.totalMinted)
          const burned = Number(list.totalBurned)
          const sold = minted - burned
          const max = Number(maxSup)

          return {
            contract: addr,
            img: list.imageBase64,
            name: await withRetry(() => col.name()),
            symbol: await withRetry(() => col.symbol()),
            desc: "none",
            price: Number(ethers.formatEther(list.currentPrice)),
            updated: Date.now(),
            supplyTotal: max,
            supplySold: sold,
            isNew: minted === 0,
            progress: max ? (sold / max) * 100 : 0,
            supply: minted,
          } satisfies Listing
        }),
      )

      const ok: Listing[] = results
        .filter(
          (r): r is PromiseFulfilledResult<Listing> => r.status === "fulfilled",
        )
        .map((r) => r.value);

      setListings((prev) => {
        const known = new Set(prev.map((l) => l.contract.toLowerCase()));
        const fresh = ok.filter(
          (l) => !known.has(l.contract.toLowerCase()),
        );
        return [...prev, ...fresh];
      });

      if (!isFirstLoad.current) {
        ok.forEach((l) =>
          toaster.create({
            title: `! NEW ! - ${l.name}`,
            meta: { link: `/trade/${l.contract}` },
            duration: 4000,
            closable: true,
          }),
        );
      }

      setLastParsedId(next);
    } catch (err) {
      console.error("fetchListings error:", err);
    } finally {
      isFirstLoad.current = false;
    }
  }, [factory, provider, lastParsedId]);

  React.useEffect(() => {
    fetchListings();

    const id = setInterval(fetchListings, 5_000);

    return () => clearInterval(id);
  }, [fetchListings]);
  const router = useRouter();
  const [active, setActive] = React.useState("all");

  const refresh = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    router.reload();
  };

  return (
    <>
      <Head>
        <title>picpool | List of available collections</title>
      </Head>
      <Toaster />



      <Box bg="black" color="white" minH="100vh" px={4} py={4} position="relative">
        <GridDots top={[6, 10]} left={[4, 10]} />
        <GridDots top={[6, 10]} right={[4, 10]} />
        <GridDots bottom={[6, 10]} left={[4, 10]} />
        <GridDots bottom={[6, 10]} right={[4, 10]} />


        <Flex
          as="nav"
          w={["full", "70%"]}
          maxW="6xl"
          mx="auto"
          mb={[8, 12]}
          px={[0, 4]}
          py={3}
          align="center"
          justify="space-between"
        >

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

        <Flex direction="column" align="center" maxW="6xl" mx="auto">

          <HStack gap={3} mb={8}>
            {filters.map((f) => (
              <Button
                key={f.key}
                onClick={() => setActive(f.key)}
                size="xs"
                bg="none"
                color={active === f.key ? "white" : "gray.400"}
                _hover={{ color: "#c11c84" }}
                className={pixel4Font.className}
              >
                {">" + f.label + "<"}
              </Button>
            ))}
          </HStack>

          <SimpleGrid columns={[1, 1, 2]} gap={8} w="80%">
            {listings
              .filter((l) => {
                if (active === "new") return l.isNew;
                if (active === "almost") return l.progress >= 90 && l.progress < 100;
                if (active === "sold") return l.progress === 100;
                return true;
              })
              .map((item) => (
                <ChakraLink
                  as={NextLink}
                  href={`/trade/${item.contract}`}
                  _hover={{ textDecoration: "none" }}
                  key={item.contract}
                >
                  <Box
                    border="2px solid #c11c84"
                    p={6}
                    bg="black"
                    position="relative"
                    _hover={{ boxShadow: "0 0 0 3px #c11c84" }}
                    w="100%"
                    minH="100%"
                  >
                    <Flex direction={["column", "row"]} gap={6} align="center">
                      <Box flexShrink={0}>
                        <NextImage
                          src={item.img}
                          alt={item.name}
                          width={160}
                          height={160}
                          style={{ objectFit: "cover" }}
                        />
                      </Box>


                      <VStack align="start" gap={1} flex="1" pr="60px">

                        <Box position="absolute" top={4} right={4} textAlign="right">
                          <Heading fontSize="md" className={pixelFont.className}>
                            {item.name}
                          </Heading>
                          <Text pt={2} fontSize="2xs" color="gray.400" className={pixel3Font.className}>
                            ${item.symbol}
                          </Text>
                          <Text pt={5} fontSize="xs" color="#c11c84" className={pixel3Font.className}>
                            {item.price.toFixed(5)} MON
                          </Text>
                          <Tooltip content={`Left ${100 - item.progress}% NFT`}>
                            <Text
                              fontSize="xs"
                              fontWeight="bold"
                              cursor="default"
                              style={{
                                color: `hsl(${item.progress}, 80%, 50%)`,
                              }}
                              className={pixel4Font.className}
                            >
                              {item.progress}%
                            </Text>
                          </Tooltip>
                        </Box>

                      </VStack>


                      <HStack gap={2} position="absolute" bottom={2} right={4}>
                        <Text fontSize="lg" className={pixel1Font.className} color="gray.500">
                          last update at {new Date(item.updated).toLocaleString()}
                        </Text>
                      </HStack>
                    </Flex>
                  </Box>
                </ChakraLink>
              ))}
          </SimpleGrid>
        </Flex>
      </Box>
    </>
  );
};

export default Trade;
