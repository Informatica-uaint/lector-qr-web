import asyncio
from aioesphomeapi import APIClient

HOST = "10.0.5.5"
PORT = 6053
DEVICE_NAME = "arturito"
API_KEY = "t/VoqhqIBGp+oA08m3II5lZDM+ws3zsAlP7tc5oLm9k="

async def main():
    client = APIClient(HOST, PORT, DEVICE_NAME, noise_psk=API_KEY)
    await client.connect(login=True)

    entities, _ = await client.list_entities_services()
    abrir_button = None
    for ent in entities:
        if ent.name.lower() == "abrir":
            abrir_button = ent
            break

    if abrir_button is None:
        print("❌ No se encontró el botón 'Abrir'")
    else:
        print(f"✅ Botón encontrado: {abrir_button}")
        # ❌ antes:
        # await client.button_command(abrir_button.key)
        # ✅ ahora:
        client.button_command(abrir_button.key)
        # opcional: darle tiempo a que se envíe el comando
        await asyncio.sleep(0.5)

    await client.disconnect()

if __name__ == "__main__":
    asyncio.run(main())
