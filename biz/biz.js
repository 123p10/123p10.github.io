let connected_device = null;
let reader = null;
let writer = null;
let requestButton = document.getElementById("connectbtn");
let sts_txt = document.getElementById("connection-sts");
let ack_sts = document.getElementById("ack-sts");

BUFF_LEN = 2;
BYTES_PER_LED = 3;
NUM_LEDS = 36;
PROTOCOL_LEN = 16;

DATA_BYTE = 0x55;

ACK_BYTE = new Uint8Array([0x77]);
ACK_RESP = new Uint8Array([0x48, 0x49]);

STATE_DC = 0x00;
STATE_WAITING_ACK = 0x81;
STATE_IDLE = 0x82;
STATE_RAINBOW = 0x83;
state = 0;

counter = 0;

document.getElementById("rainbowbtn").addEventListener("click", async () => {
	state = STATE_RAINBOW;
	counter = 0;
});

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
	writer = connected_device.writable.getWriter();
    await writer.ready;
	await writer.write(buffer);
	await writer.close();
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
	}
});

let lock = 0;
var intervalId = setInterval(async function() {
	if(lock == 0) {
		lock = 1;
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
			} else if (state == STATE_RAINBOW) {
				document.getElementById("rainbowcontrol").style.display = "flex";
				await rainbow_animation();			
			}

			if (state != STATE_RAINBOW) {
				document.getElementById("rainbowcontrol").style.display = "none";
			}
		}
		lock = 0;
	}


}, 100);

async function write_data(led_data) {
	const x_y_map = [0, 1, 2, 3, 4, 5,
           11, 10, 9, 8, 7, 6,
           12, 13, 14, 15, 16, 17,
           23, 22, 21, 20, 19, 18,
           24, 25, 26, 27, 28, 29,
           35, 34, 33, 32, 31, 30];
	for(let i = 0; i < BUFF_LEN; i++) {
		for(let j = 0; j < 3; j++) {
			let n = Math.min(NUM_LEDS - j*PROTOCOL_LEN, PROTOCOL_LEN);
			let b = [DATA_BYTE, i, PROTOCOL_LEN * j, n];
			for(let k = 0; k < n; k++) {
				let led = led_data[i][x_y_map[j*PROTOCOL_LEN + k]];
				b.push(led.red, led.green, led.blue);
			}
			let tx_buff = new Uint8Array(b);
			await serial_write(tx_buff);
		}
	}
}


async function rainbow_animation() {
	let speed = document.getElementById("rainbowspeed").value;
	let lum = document.getElementById("rainbowluminance").value;
	function hsl2rgb(h,s,l) 
	{
		let a=s*Math.min(l,1-l);
		let f= (n,k=(n+h/30)%12) => l - a*Math.max(Math.min(k-3,9-k,1),-1);
		return [f(0),f(8),f(4)];
	}
	let led_grid = [];
	for(let y = 0; y < 6; y++) {
		for(let x = 0; x < 6; x++) {
			let rgb = hsl2rgb((speed*(counter+x)) % 360,1,lum);
			let st = {
				red: Math.floor(rgb[0]*255),
				green: Math.floor(rgb[1]*255),
				blue: Math.floor(rgb[2]*255)
			}
			led_grid.push(st);
		}
	}
	output_buff = [led_grid, led_grid]
	await write_data(output_buff);
	counter = counter + 1;
}
