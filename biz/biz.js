let connected_device = null;
let reader = null;
let writer = null;
let requestButton = document.getElementById("connectbtn");
let sts_txt = document.getElementById("connection-sts");
let ack_sts = document.getElementById("ack-sts");

ACK_BYTE = new Uint8Array([0x77]);
ACK_RESP = new Uint8Array([0x48, 0x49]);

STATE_DC = 0x00;
STATE_WAITING_ACK = 0x81;
STATE_IDLE = 0x82;
state = 0;

async function serial_read(buffer) {
  let offset = 0;
  while (offset < buffer.byteLength) {
    const { value, done } = await reader.read(
      new Uint8Array(buffer, offset)
    );
    if (done) {
      break;
    }
    buffer = value.buffer;
    offset += value.byteLength;
  }
  return new Uint8Array(buffer);
}

async function serial_write(buffer) {
	await writer.write(buffer);
	writer.releaseLock();
}


requestButton.addEventListener("click", async () => {
	let device;
	try {
		device = await navigator.serial.requestPort({ filters: [
			{
				usbVendorId: 1155,
				usbProductId: 0xFEEE
			}
		] });
	} catch (e) {
		console.log("Error:");
		console.log(e);
	}
	if (!device) {
		console.log("No device selected");
		sts_txt.innerHTML = "No Device Connected.";
		sts_txt.style.color = "red";
	} else {
		await device.open({baudRate: 230400});
		sts_txt.innerHTML = "Device Connected";
		sts_txt.style.color = "green";
		ack_sts.innerHTML = "Awaiting ACK";
		ack_sts.style.color = "red";
		connected_device = device;
		state = STATE_WAITING_ACK;
		reader = device.readable.getReader({ mode: "byob" });
		writer = device.writable.getWriter();
	}
});


var intervalId = setInterval(async function() {
	if(connected_device && connected_device.writable) {
		if (state == STATE_WAITING_ACK) {
			ack_sts.innerHTML = "Awaiting ACK";
			ack_sts.style.color = "red";
				
			let tx_buffer = new Uint8Array([0x77]);
			await serial_write(tx_buffer);
			let rx_buffer = new ArrayBuffer(2);
			rx_buffer = await serial_read(rx_buffer);
			if (rx_buffer[0] == ACK_RESP[0] && rx_buffer[1] == ACK_RESP[1]) {
				state = STATE_IDLE;
				console.log("RXed ACK");
			}
		} else if (state == STATE_IDLE) {
			ack_sts.innerHTML = "ACK Received";
			ack_sts.style.color = "green";
		}
	}


}, 200);
/*
device.addEventListener("inputreport", (event) => {
  const { data, device, reportId } = event;

  if (device.productId !== 0xFEEE || device.vendorId !== 1155) return;

  const value = data.getUint8(0);
  if (value === 0) return;

  const someButtons = { 1: "A", 2: "X", 4: "B", 8: "Y" };
  console.log(`User pressed button ${someButtons[value]}.`);
});
*/

