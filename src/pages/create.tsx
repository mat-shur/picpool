"use client";

import {
  Box,
  Flex,
  Heading,
  Text,
  VStack,
  Input,
  Button,
  Image,
  Icon,
  Spinner,
  SimpleGrid,
  BoxProps
} from "@chakra-ui/react";
import Head from "next/head";
import { Tooltip } from "@/components/ui/tooltip"
import NextLink from "next/link";
import { useEffect, useState } from "react";
import localFont from "next/font/local";
import { HiUpload } from "react-icons/hi";
import { ethers } from "ethers";
import { useAccount, useWalletClient } from "wagmi";
import factory_abi from "@/web3/factory_abi.json";
import { FACTORY_ADDRESS } from "@/web3/config";
import { toaster, Toaster } from "@/components/ui/new_listing_toaster";
import { ConnectButton } from "@rainbow-me/rainbowkit";

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

const CreateListing = () => {
  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [startPrice, setStartPrice] = useState(0);
  const [finalPrice, setFinalPrice] = useState(0);
  const [maxSupply, setMaxSupply] = useState(0);
  const [initialMintCnt, setInitialMintCnt] = useState(0);

  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();
  const [userBalance, setUserBalance] = useState<bigint>(0n);


  const notify = (
    title: string,
    description = "",
    status: "info" | "success" | "warning" | "error" = "info",
  ) =>
    toaster.create({
      title,
      description,
      duration: 4000,
      closable: true,
    });

  useEffect(() => {
    const loadBalance = async () => {
      if (!address || !window.ethereum) return;
      const provider = new ethers.BrowserProvider(window.ethereum as any);
      const bal = await provider.getBalance(address);
      setUserBalance(bal);
    };
    loadBalance();
  }, [address]);


  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();

      if (data.url) {
        setImageUrl(data.url);
        notify("Image uploaded", "Preview updated", "success");
      } else {
        notify("Upload failed", data.error ?? "Unknown error", "error");
      }
    } catch (err: any) {
      console.error(err);
      notify("Upload failed", err.message, "error");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!address || !walletClient) {
      notify("Connect wallet first", "", "warning");
      return;
    }

    if (!imageUrl) {
      notify("Upload image first", "", "warning");
      return;
    }

    if (startPrice <= 0) {
      notify("Start price must be greater than 0", "", "warning");
      return;
    }

    if (finalPrice <= startPrice) {
      notify("Final price must be greater than start price", "", "warning");
      return;
    }

    if (finalPrice > 10) {
      notify("Final price must be less than 10", "", "warning");
      return;
    }

    if (maxSupply < 1 || maxSupply >= 69420) {
      notify("Max supply must be between 1 and 69420", "", "warning");
      return;
    }

    if (initialMintCnt < 0) {
      notify("Initial mint count must be greater than 0", "", "warning");
      return;
    }

    if (initialMintCnt > 10) {
      notify("Initial mint count must be less than 10", "", "warning");
      return;
    }

    if (initialMintCnt > maxSupply) {
      notify("Initial mint count must be less than max supply", "", "warning");
      return;
    }

    if (!name || !symbol) {
      notify("Name and symbol are required", "", "warning");
      return;
    }

    const provider = new ethers.BrowserProvider(window.ethereum as any);
    const signer = await provider.getSigner();

    const requiredWei = ethers.parseEther(
      (0.25 + startPrice * initialMintCnt).toString(),
    );

    if (userBalance < requiredWei) {
      notify(
        "Not enough funds",
        `Need ≈ ${ethers.formatEther(requiredWei)} MON`,
        "error",
      );
      return;
    }

    try {
      const contract = new ethers.Contract(FACTORY_ADDRESS, factory_abi, signer);
      const value = ethers.parseEther((startPrice * initialMintCnt).toString());

      notify("Transaction sent", "Waiting for confirmation…", "info");
      setIsSubmitting(true);

      const tx = await contract.createListing(
        ethers.parseEther(startPrice.toString()),
        ethers.parseEther(finalPrice.toString()),
        maxSupply,
        name,
        symbol,
        imageUrl,
        initialMintCnt,
        { value },
      );
      await tx.wait();

      notify("Listing created!", "🎉", "success");

      toaster.create({
        title: "Listing Created",
        meta: { link: "/trade" },
        duration: 4000,
      });
    } catch (err: any) {
      console.error(err);
      notify("Transaction failed", err.message, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const gSum = (a: number, r: number, n: number) =>
    r === 1 ? a * n
      : a * (Math.pow(r, n) - 1) / (r - 1);
  const stepFactor =
    maxSupply > 1 && startPrice > 0
      ? Math.pow(finalPrice / startPrice, 1 / (maxSupply - 1))
      : 1;

  const priceStep = stepFactor === 1 ? 0 : startPrice * (stepFactor - 1);
  const totalReturn = gSum(startPrice, stepFactor, maxSupply);
  const preMintCost = gSum(startPrice, stepFactor, initialMintCnt);

  const requiredEth = 0.25 + preMintCost;

  const balanceEth = Number(ethers.formatEther(userBalance || 0n));

  return (
    <>
      <Head>
        <title>picpool | Create listing</title>
      </Head>
      <Toaster />

      <Box bg="black" color="white" px={4} py={8} minH="100vh">


        <GridDots top={[6, 10]} left={[4, 10]} />
        <GridDots top={[6, 10]} right={[4, 10]} />
        <GridDots bottom={[6, 10]} left={[4, 10]} />
        <GridDots bottom={[6, 10]} right={[4, 10]} />

        <Flex
          as="nav"
          w={["full", "70%"]}
          maxW="6xl"
          mx="auto"
          mb={5}
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

        <Flex direction="column" align="center">
          <Heading
            mb={24}
            fontSize={["3xl", "4xl"]}
            className={pixelFont.className}
            textAlign="center"
          >
            CREATE NEW LISTING
          </Heading>

          <SimpleGrid columns={[1, null, 3]} gap={12} w="full" maxW="7xl">

            <VStack align="end" gap={3}>
              <Text fontSize="sm" className={pixel3Font.className}>
                Price step per mint:
              </Text>
              <Text color="#c11c84" fontSize="xs" fontWeight="bold" className={pixel3Font.className}>
                {priceStep.toFixed(4)} MON
              </Text>

              <Text fontSize="sm" className={pixel3Font.className}>
                Total MON to owner:
              </Text>
              <Text color="#c11c84" fontSize="xs" fontWeight="bold" className={pixel3Font.className}>
                {totalReturn.toFixed(4)} MON
              </Text>

              <Text fontSize="sm" className={pixel3Font.className}>
                Required deposit:
              </Text>
              <Text color="#c11c84" fontSize="xs" fontWeight="bold" className={pixel3Font.className}>
                {requiredEth.toFixed(4)} MON
              </Text>

              <Text fontSize="sm" className={pixel3Font.className}>
                Your balance:
              </Text>
              <Text
                color={balanceEth >= requiredEth ? "#c11c84" : "red.400"}
                fontSize="xs"
                fontWeight="bold"
                className={pixel3Font.className}
              >
                {balanceEth.toFixed(4)} MON
              </Text>
            </VStack>


            <VStack gap={4} align="stretch">
              <Text fontSize="2xs" className={pixel3Font.className} textAlign="start">
                Name
              </Text>
              <Input
                maxLength={30}
                fontSize="2xs"
                outline="none"
                border="1px solid #c11c84"
                className={pixel3Font.className}
                placeholder=""
                value={name}
                onChange={(e) => setName(e.target.value)}
              />

              <Text fontSize="2xs" className={pixel3Font.className} textAlign="start">
                Symbol
              </Text>
              <Input
                maxLength={10}
                fontSize="2xs"
                outline="none"
                border="1px solid #c11c84"
                className={pixel3Font.className}
                placeholder=""
                value={symbol}
                onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              />

              <Text fontSize="2xs" className={pixel3Font.className} textAlign="start">
                Start price
              </Text>
              <Input
                fontSize="2xs"
                border="1px solid #c11c84"
                className={pixel3Font.className}
                placeholder="1.0 MON"
                type="number"
                min={0}
                onChange={(e) => setStartPrice(parseFloat(e.target.value))}
                outline="none"
              />

              <Text fontSize="2xs" className={pixel3Font.className} textAlign="start">
                Final price
              </Text>
              <Input
                fontSize="2xs"
                border="1px solid #c11c84"
                className={pixel3Font.className}
                placeholder="2.0 MON"
                type="number"
                min={0}
                onChange={(e) => setFinalPrice(parseFloat(e.target.value))}
                outline="none"
              />

              <Text fontSize="2xs" className={pixel3Font.className} textAlign="start">
                Max supply
              </Text>
              <Input
                fontSize="2xs"
                border="1px solid #c11c84"
                className={pixel3Font.className}
                placeholder="100"
                type="number"
                min={1}
                onChange={(e) => setMaxSupply(parseInt(e.target.value))}
                outline="none"
              />

              <Text fontSize="2xs" className={pixel3Font.className} textAlign="start">
                Initial mint (no more than 10)
              </Text>
              <Input
                fontSize="2xs"
                border="1px solid #c11c84"
                className={pixel3Font.className}
                placeholder="3"
                type="number"
                min={1}
                max={10}
                onChange={(e) => setInitialMintCnt(parseInt(e.target.value))}
                outline="none"
              />

              <Text fontSize="2xs" className={pixel3Font.className} textAlign="start">
                Image
              </Text>
              <input
                id="imgInput"
                type="file"
                hidden
                accept="image/*"
                onChange={handleUpload}
              />
              <Button
                variant="outline"
                gap={2}
                fontSize="2xs"
                border="1px solid #c11c84"
                className={pixel3Font.className}
                loading={isUploading}
                onClick={() => document.getElementById("imgInput")!.click()}
              >
                {isUploading ? <Spinner size="sm" /> : <Icon as={HiUpload} />}
                {imageUrl ? "re-upload" : "upload"}
              </Button>

              <Tooltip
                disabled={!address}
                content="Please connect your wallet"
              >
                <span>
                  <Button
                    mt={8}
                    fontSize="3xs"
                    border="1px solid #c11c84"
                    className={pixel3Font.className}
                    onClick={handleSubmit}
                    loading={isSubmitting}
                    disabled={!address || isUploading || isSubmitting}
                    w="full"
                  >
                    {!address ? "CONNECT YOUR WALLET FIRST" : "SUBMIT LISTING"}
                  </Button>
                </span>
              </Tooltip>
            </VStack>

            <VStack align="start" gap={4}>
              <Text fontSize="xs" color="gray.400" className={pixel3Font.className}>
                <span style={{ color: "red", fontSize: "2em" }}>!</span> Initial mint (up to 10 NFTs) happens during creation. You must send
                at least <strong>startPrice × mintCount</strong> in MON.
              </Text>
              <Text fontSize="xs" color="gray.400" className={pixel3Font.className}>
                <span style={{ color: "blue", fontSize: "2em" }}>!</span> Funds can be claimed only <em>after full mint</em>. Make sure the collection
                is desirable enough.
              </Text>
              <Text fontSize="xs" color="gray.400" className={pixel3Font.className}>
                <span style={{ color: "green", fontSize: "2em" }}>!</span> Max supply is capped at <strong>10 000</strong>. Avoid overpriced NFTs —
                your price curve should encourage fast full mint.
              </Text>
            </VStack>
          </SimpleGrid>

          <Box mt={16} w={`${name.length + 12}%`} minW="25%" maxW="3xl" border="2px solid #c11c84" p={6}>
            <Flex gap={6} align="top">
              {imageUrl && (
                <Image
                  src={imageUrl}
                  alt="preview"
                  boxSize="140px"
                  objectFit="cover"
                />
              )}
              <VStack align="end" gap={1} w="100%">
                <Heading fontSize="md" className={pixelFont.className}>
                  {name || "Test Name"}
                </Heading>
                <Text fontSize="xs" color="gray.400" className={pixel3Font.className}>
                  ${symbol || "TEST"}
                </Text>
                <Text fontSize="xs" color="#c11c84" className={pixel3Font.className}>
                  {startPrice} MON
                </Text>
              </VStack>
            </Flex>
          </Box>
        </Flex>
      </Box>
    </>
  );
};

export default CreateListing;
