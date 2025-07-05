"use client"

import {
  Toaster as ChakraToaster,
  Portal,
  Stack,
  Toast,
  HStack,
  Icon,
  Link,
  createToaster,
} from "@chakra-ui/react";
import { RiNftFill } from "react-icons/ri";

import localFont from "next/font/local";
const pixel11Font = localFont({ src: "../../fonts/test.ttf" }); 

export const toaster = createToaster({
  placement: "bottom-start", 
  pauseOnPageIdle: true,
  max: 5,                
});

export const Toaster = () => {
  return (
    <Portal>
      <ChakraToaster toaster={toaster} insetInline={{ mdDown: "4" }} w="30%">
        {(toast) => (
          <Toast.Root
            width={"30%"}
            bg="#c11c84"          
            color="white"
            className={pixel11Font.className}
            rounded="md"
            px="3"
            py="2"
            w="xs"
          >
            <HStack gap="2" align="flex-start" w="100%">
              <Stack gap="1" flex="1" maxW="100%">
                {toast.meta?.link ? (
                  <Link
                    href={toast.meta.link}
                    color="white"
                    _hover={{ textDecoration: "none" }}
                    fontWeight="bold"
                    fontSize="sm"

                  >
                    {toast.title}
                  </Link>
                ) : (
                  toast.title && (
                    <Toast.Title fontWeight="bold" fontSize="sm">
                      {toast.title}
                    </Toast.Title>
                  )
                )}

                {toast.description && (
                  <Toast.Description fontSize="xs">
                    {toast.description}
                  </Toast.Description>
                )}
              </Stack>

            </HStack>
          </Toast.Root>
        )}
      </ChakraToaster>
    </Portal>
  );
};
