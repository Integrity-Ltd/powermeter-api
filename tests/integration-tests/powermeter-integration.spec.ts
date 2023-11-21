import request from "supertest";
import { StatusCodes } from "http-status-codes";
import exportedApp from "../../src/app";

jest.setTimeout(60000);
describe("PowerMeter integration tests", () => {
	let lastID: number;
	beforeAll(async () => { });

	test("Create unfilled powermeter", async () => {
		const powermeter = {
			asset_name: "test1",
			ip_address: "192.168.1.239",
			enabled: false,
		};
		await request(exportedApp.app)
			.post("/api/admin/crud/power_meter/")
			.send(powermeter)
			.set("Accept", "application/json")
			.expect((res: request.Response) => {
				const parsedObj = JSON.parse(res.text);
				expect(parsedObj.message).toBeDefined();
			})
			.expect(StatusCodes.BAD_REQUEST);
	});

	test("Create powermeter", async () => {
		const powermeter = {
			asset_name: "test1",
			ip_address: "192.168.1.237",
			port: 50003,
			time_zone: "Europe/Budapest",
			enabled: false,
		};
		await request(exportedApp.app)
			.post("/api/admin/crud/power_meter/")
			.send(powermeter)
			.set("Accept", "application/json")
			.expect((res: request.Response) => {
				const parsedObj = JSON.parse(res.text);
				lastID = parsedObj.lastID;
				expect(parsedObj.lastID).toBeDefined();
			})
			.expect(StatusCodes.OK);
	});

	test("Powermeters count", async () => {
		await request(exportedApp.app)
			.get("/api/admin/crud/power_meter/count")
			.set("Accept", "application/json")
			.expect((res: request.Response) => {
				const parsedObj = JSON.parse(res.text);
				expect(parsedObj.count).toBeGreaterThanOrEqual(1);
			})
			.expect(StatusCodes.OK);
	});

	test("Request powermeters list", async () => {
		await request(exportedApp.app)
			.get("/api/admin/crud/power_meter/")
			.set("Accept", "application/json")
			.expect((res: request.Response) => {
				const parsedObj = JSON.parse(res.text);
				expect(parsedObj.length).toBeGreaterThanOrEqual(1);
				expect(parsedObj[0].id).toBeDefined();
			})
			.expect(StatusCodes.OK);
	});

	test("Update powermeter", async () => {
		const powermeter = {
			asset_name: "test12",
			ip_address: "192.168.1.239",
			port: 50003,
			time_zone: "Europe/Budapest",
			enabled: false,
		};
		await request(exportedApp.app)
			.put("/api/admin/crud/power_meter/" + lastID)
			.send(powermeter)
			.set("Accept", "application/json")
			.expect((res: request.Response) => {
				const parsedObj = JSON.parse(res.text);
				expect(parsedObj.count).toEqual(1);
			})
			.expect(StatusCodes.OK);
	});

	test("Get specified powermeter", async () => {
		await request(exportedApp.app)
			.get("/api/admin/crud/power_meter/" + lastID)
			.set("Accept", "application/json")
			.expect((res: request.Response) => {
				const parsedObj = JSON.parse(res.text);
				expect(parsedObj.asset_name).toEqual("test12");
			})
			.expect(StatusCodes.OK);
	});

	test("Delete powermeter", async () => {
		await request(exportedApp.app)
			.delete("/api/admin/crud/power_meter/" + lastID)
			.set("Accept", "application/json")
			.expect((res: request.Response) => {
				const parsedObj = JSON.parse(res.text);
				expect(parsedObj.count).toEqual(1);
			})
			.expect(StatusCodes.OK);
	});

	afterAll(() => {
		exportedApp.server.close();
	});
});
