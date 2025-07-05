import { NextPage } from "next";
import Head from "next/head";
import {
  Box,
  Flex,
  Heading,
  Text,
  VStack,
  Link,
  BoxProps,
} from "@chakra-ui/react";
import localFont from "next/font/local";
import NextImage from "next/image";
import { ConnectButton } from "@rainbow-me/rainbowkit";

import pepeMon from "../images/pepe_mon.png";

const monoDisplay = localFont({ src: "../fonts/vanquish.otf" });
const pixelFont = localFont({ src: "../fonts/Fipps-Regular.otf" });
const pixel1Font = localFont({ src: "../fonts/Litebulb 8-bit.ttf" });
const pixel3Font = localFont({ src: "../fonts/PressStart2P-Regular.ttf" });

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

const Home: NextPage = () => {
  return (
    <>
      <Head>
        <title>picpool</title>
        <meta name="description" content="Front-end developer portfolio of Elias." />
      </Head>

      <Box
        position="relative"
        bg="black"
        color="white"
        minH="100vh"
        overflow="hidden"
        px={4}
        py={4}
      >
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

          <ConnectButton
            chainStatus="icon"
            accountStatus="address"
            showBalance={true}
          />
        </Flex>

        <Flex direction="column" align="center" maxW="6xl" mx="auto">
          <Box position="relative" w="full" textAlign="center" mb={4} overflow="visible">
            <Box
              position="absolute"
              top="50%"
              left="50%"
              w="100vw"
              h={"2.4em"}
              bg="#5e6d8f"
              transform="translate(-50%, -50%)"
              pointerEvents="none"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 40 40'%3E%3Ctext x='0' y='30' font-size='30' font-family='monospace' fill='white' opacity='0.08'%3E%24%3C/text%3E%3C/svg%3E")`,
                backgroundRepeat: "repeat",
                backgroundSize: "40px 40px",
              }}
            />

            <Heading
              className={monoDisplay.className}
              fontSize={["5xl", "6xl", "7xl"]}
              fontWeight="extrabold"
              letterSpacing="wider"
              position="relative"
              zIndex={1}
            >
              MAKE NFT GREAT AGAIN!
            </Heading>
          </Box>

          <Box position="relative" w="full" maxW="5xl" mt={12}>
            <Box position="absolute" top={0} bottom={0} left={0} w="2px" bg="#c11c84" />
            <Box position="absolute" top={0} bottom={0} right={0} w="2px" bg="#c11c84" />

            <Flex
              direction={["column", "row"]}
              bg="black"
              px={[6, 14]}
              py={[10, 14]}
              gap={[10, 16]}
            >
              <VStack align="start" gap={6} flex="1">
                <Text fontSize={"3xl"} color="#c11c84" lineHeight="1.2" className={pixelFont.className}>
                  Auction-like market
                </Text>
                <Text fontSize="xs" maxW="sm" color="gray.400" className={pixel3Font.className}>
                  No limit orders or offers - you either buy or sell at the current price.
                </Text>

                <Flex mt={6} direction="row" justify="start" w="full" gap={6}>
                  <Link
                    href="create"
                    px={6}
                    py={3}
                    _hover={{ color: "#1e2530" }}
                    fontSize="xs"
                    className={pixelFont.className}
                    outline="none"
                    _focus={{ outline: "none" }}
                  >
                    {"> create <"}
                  </Link>
                  <Link
                    href="trade"
                    px={6}
                    py={3}

                    _hover={{ color: "#1e2530" }}
                    fontSize="xs"
                    className={pixelFont.className}
                    outline="none"
                    _focus={{ outline: "none" }}
                  >
                    {"> trade <"}
                  </Link>
                </Flex>
              </VStack>

              <Box flex="1" maxW={["xs"]} mx="auto">
                <NextImage src={pepeMon} alt="pepe_mon" style={{ objectFit: "cover" }} />
              </Box>
            </Flex>
          </Box>
        </Flex>
      </Box>
    </>
  );
};

export default Home;
