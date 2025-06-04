import { PHONENUMBER_MCC } from "@whiskeysockets/baileys";

export async function pairingCode(sock, phoneNumber) {
  if (!!phoneNumber) {
    phoneNumber = phoneNumber.replace(/[^0-9]/g, "");
    if (
      !Object.keys(PHONENUMBER_MCC).some((v) => phoneNumber.startsWith(v))
    ) {
      throw new Error(
        "Start with the country code of your WhatsApp Number, example: 628xxxxx"
      );
    }
  }

  setTimeout(async () => {
    let code = await sock.requestPairingCode(phoneNumber, "AGUS1234");
    code = code?.match(/.{1,4}/g)?.join("-") || code;
    console.log(
      "\n" + code
    );
  }, 3000);
}
