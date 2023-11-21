import request from "supertest";
import { StatusCodes } from "http-status-codes";
import exportedApp from "../../src/app";

jest.setTimeout(60000);
describe("PowerMeter integration tests", () => {
	let lastID: number;
	let power_meter_id: number;
	beforeAll(async () => {
		const powermeter = {
			asset_name: "test1",
			ip_address: "192.168.1.237",
			port: 50003,
			time_zone: "Europe/Budapest",
			enabled: false,
		};

		await request(exportedApp.app)
			.post("/api/admin/crud/power_meter")
			.send(powermeter)
			.set("Accept", "application/json")
			.expect((res: request.Response) => {
				const parsedObj = JSON.parse(res.text);
				power_meter_id = parsedObj.lastID;
				expect(parsedObj.lastID).toBeDefined();
			})
			.expect(StatusCodes.OK);

	});

	test("Create channel", async () => {
		const chennelObj = {
			channel_name: "testCH1",
			channel: 1,
			power_meter_id,
			enabled: false,
		};

		await request(exportedApp.app)
			.post("/api/admin/crud/channels/")
			.send(chennelObj)
			.set("Accept", "application/json")
			.expect((res: request.Response) => {
				const parsedObj = JSON.parse(res.text);
				lastID = parsedObj.lastID;
				expect(parsedObj.lastID).toBeDefined();
			})
			.expect(StatusCodes.OK);
	});

	it("Channels count", async () => {
		await request(exportedApp.app)
			.get("/api/admin/crud/channels/count")
			.set("Accept", "application/json")
			.expect((res: request.Response) => {
				const parsedObj = JSON.parse(res.text);
				expect(parsedObj.count).toBeGreaterThanOrEqual(1);
			})
			.expect(StatusCodes.OK);
	});

	test("Request channels list", async () => {
		await request(exportedApp.app)
			.get("/api/admin/crud/channels/")
			.set("Accept", "application/json")
			.expect((res: request.Response) => {
				const parsedObj = JSON.parse(res.text);
				expect(parsedObj.length).toBeGreaterThanOrEqual(1);
				expect(parsedObj[0].id).toBeDefined();
			})
			.expect(StatusCodes.OK);
	});

	test("Update channel", async () => {
		const chennelObj = {
			channel_name: "testCH12",
			channel: 1,
			power_meter_id,
			enabled: false,
		};
		await request(exportedApp.app)
			.put("/api/admin/crud/channels/" + lastID)
			.send(chennelObj)
			.set("Accept", "application/json")
			.expect((res: request.Response) => {
				const parsedObj = JSON.parse(res.text);
				expect(parsedObj.count).toEqual(1);
			})
			.expect(StatusCodes.OK);
	});

	it("Get specified powermeter", async () => {
		await request(exportedApp.app)
			.get("/api/admin/crud/channels/" + lastID)
			.set("Accept", "application/json")
			.expect((res: request.Response) => {
				const parsedObj = JSON.parse(res.text);
				expect(parsedObj.channel_name).toEqual("testCH12");
			})
			.expect(StatusCodes.OK);
	});

	test("Delete channel", async () => {
		await request(exportedApp.app)
			.delete("/api/admin/crud/channels/" + lastID)
			.set("Accept", "application/json")
			.expect((res: request.Response) => {
				const parsedObj = JSON.parse(res.text);
				expect(parsedObj.count).toEqual(1);
			})
			.expect(StatusCodes.OK);
	});

	afterAll(async () => {
		await request(exportedApp.app)
			.delete("/api/admin/crud/power_meter/" + power_meter_id)
			.set("Accept", "application/json")
			.expect((res: request.Response) => {
				const parsedObj = JSON.parse(res.text);
				expect(parsedObj.count).toEqual(1);
			})
			.expect(StatusCodes.OK);
		exportedApp.server.close();
	});
});
