%%start
layout = namespace flight "maps/layout.w";
wright = namespace flight "maps/wright.w";
paris = namespace flight "maps/paris.w";

layout.Course map_plan = wright.course_layout();

host = extern wasm "flight" {
	unsafe unit(*?u8, i32) world;
	unsafe unit(*?u8, i32) aircraft;
	unsafe unit(*?u8, i32) frame;
	unsafe unit(*?u8, i32) record;
};

f32[6] empty_vertex = [0.0, 0.0, 0.0, 0.0, 0.0, 0.0];
f32[6][16] mesh_chunk_0 = [empty_vertex, empty_vertex, empty_vertex, empty_vertex, empty_vertex, empty_vertex, empty_vertex, empty_vertex, empty_vertex, empty_vertex, empty_vertex, empty_vertex, empty_vertex, empty_vertex, empty_vertex, empty_vertex];
f32[6][16][16] mesh_chunk_1 = [mesh_chunk_0, mesh_chunk_0, mesh_chunk_0, mesh_chunk_0, mesh_chunk_0, mesh_chunk_0, mesh_chunk_0, mesh_chunk_0, mesh_chunk_0, mesh_chunk_0, mesh_chunk_0, mesh_chunk_0, mesh_chunk_0, mesh_chunk_0, mesh_chunk_0, mesh_chunk_0];
f32[6][16][16][16] mesh_chunk_2 = [mesh_chunk_1, mesh_chunk_1, mesh_chunk_1, mesh_chunk_1, mesh_chunk_1, mesh_chunk_1, mesh_chunk_1, mesh_chunk_1, mesh_chunk_1, mesh_chunk_1, mesh_chunk_1, mesh_chunk_1, mesh_chunk_1, mesh_chunk_1, mesh_chunk_1, mesh_chunk_1];
f32[6][16][16][16][8] scenery = [mesh_chunk_2, mesh_chunk_2, mesh_chunk_2, mesh_chunk_2, mesh_chunk_2, mesh_chunk_2, mesh_chunk_2, mesh_chunk_2];
f32[6][16][16][8] moving_mesh = [mesh_chunk_1, mesh_chunk_1, mesh_chunk_1, mesh_chunk_1, mesh_chunk_1, mesh_chunk_1, mesh_chunk_1, mesh_chunk_1];
u8[16] empty_bytes = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
u8[16][16] byte_chunk_0 = [empty_bytes, empty_bytes, empty_bytes, empty_bytes, empty_bytes, empty_bytes, empty_bytes, empty_bytes, empty_bytes, empty_bytes, empty_bytes, empty_bytes, empty_bytes, empty_bytes, empty_bytes, empty_bytes];
u8[16][16][16] byte_chunk_1 = [byte_chunk_0, byte_chunk_0, byte_chunk_0, byte_chunk_0, byte_chunk_0, byte_chunk_0, byte_chunk_0, byte_chunk_0, byte_chunk_0, byte_chunk_0, byte_chunk_0, byte_chunk_0, byte_chunk_0, byte_chunk_0, byte_chunk_0, byte_chunk_0];
u16[16] empty_controls = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
u16[16][16] control_chunk_0 = [empty_controls, empty_controls, empty_controls, empty_controls, empty_controls, empty_controls, empty_controls, empty_controls, empty_controls, empty_controls, empty_controls, empty_controls, empty_controls, empty_controls, empty_controls, empty_controls];
u16[16][16][16] control_chunk_1 = [control_chunk_0, control_chunk_0, control_chunk_0, control_chunk_0, control_chunk_0, control_chunk_0, control_chunk_0, control_chunk_0, control_chunk_0, control_chunk_0, control_chunk_0, control_chunk_0, control_chunk_0, control_chunk_0, control_chunk_0, control_chunk_0];
u16[16][16][16][2] flight_log = [control_chunk_1, control_chunk_1];
u8[16][16][16][4] best_log = [byte_chunk_1, byte_chunk_1, byte_chunk_1, byte_chunk_1];
u8[16][16][16][4] incoming_log = [byte_chunk_1, byte_chunk_1, byte_chunk_1, byte_chunk_1];
struct copy AircraftPose {
	f32 x;
	f32 y;
	f32 z;
	f32 heading;
	f32 pitch;
	f32 roll;
	f32 speed;
	f32 climb;
}

struct copy RenderPose {
	f32 x;
	f32 y;
	f32 z;
	f32 heading;
	f32 pitch;
	f32 roll;
}

enum copy MissionPhase {
	seine_crossing;
	mail_approach;
	landing_approach;
	final_rollout;
	mail_in_flight;
	takeoff;
	supply_approach;
	supply_rollout;
	cargo_pickup;
	cargo_takeoff;
	crop_spray;
}

AircraftPose initial_pose = {
	.x = 0.0; .y = 0.0; .z = 0.0; .heading = 0.0; .pitch = 0.0; .roll = 0.0;
	.speed = 0.0; .climb = 0.0;
};
AircraftPose[3] poses = [initial_pose, initial_pose, initial_pose];
RenderPose empty_presentation = {
	.x = 0.0; .y = 0.0; .z = 0.0; .heading = 0.0; .pitch = 0.0; .roll = 0.0;
};
RenderPose[2] previous_pose = [empty_presentation, empty_presentation];
RenderPose[2] presented_pose = [empty_presentation, empty_presentation];
f32[36] display = [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0];
f32[7] empty_mail = [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0];
f32[7][3] mail = [empty_mail, empty_mail, empty_mail];

i32 course = 0;
bool cockpit_view = false;
f32 cockpit_drive = 0.0;
i32 vertex_count = 0;
bool world_ready = false;
bool drawing_world = false;
MissionPhase[3] phase = [MissionPhase::seine_crossing, MissionPhase::seine_crossing, MissionPhase::seine_crossing];
i32[3] result = [0, 0, 0];
i32[3] route = [0, 0, 0];
i32[3] stage_tick = [0, 0, 0];
i32[3] spray_count = [0, 0, 0];
i32 spray_tick = -50;
i32[3] next_gate = [0, 0, 0];
i32[3] ring_score = [0, 0, 0];
i32 earned_gates = 0;
i32 gate_flash = -1;
i32 gate_flash_until = 0;
i32[3] event_code = [0, 0, 0];
bool pending_drop = false;
i32 best_ticks = 0;
i32 incoming_count = 0;

bool incoming_bad = false;
f32 accumulator = 0.0;
f32 viewport = 1.0;
f32 model_x = 0.0;
f32 model_y = 0.0;
f32 model_z = 0.0;
f32 model_hs = 0.0;
f32 model_hc = 1.0;
f32 model_ps = 0.0;
f32 model_pc = 1.0;
f32 model_rs = 0.0;
f32 model_rc = 1.0;
bool model_ghost = false;
bool model_local = false;

u64(i32) ix = fn(value) { core.int_extend<u64>(value) };
f32(f32) abs_f = fn(value) { if (value < 0.0) { -value } else { value } };
f32(f32, f32, f32) clamp = fn(v, lo, hi) { if (v < lo) { lo } else { if (v > hi) { hi } else { v } } };
f32(f32) wrap = fn(a) { if (a > 3.14159265) { a - 6.28318530 } else { if (a < -3.14159265) { a + 6.28318530 } else { a } } };
f32(f32) sin_small = fn(a) {
	f32 u = if (a > 1.57079633) { 3.14159265 - a } else { if (a < -1.57079633) { -3.14159265 - a } else { a } };
	f32 d = u * u;
	u * (1.0 - d * (0.166666667 - d * (0.008333333 - d * 0.000198413)))
};
f32(f32) cos_small = fn(a) { sin_small(wrap(a + 1.57079633)) };
f32(f32, f32, f32) blend = fn(a, b, r) { a + (b - a) * r };
f32(i32) float_i = fn(a) { core.sint_to_float<f32>(a) };



unit(f32, f32, f32, f32, f32, f32) put = fn(x, y, z, r, g, b) {
	i32 i = vertex_count;
	vertex_count = i + 1;
	u64 high = ix(i / 4096);
	u64 layer = ix(i / 256 % 16);
	u64 row = ix(i / 16 % 16);
	u64 cell = ix(i % 16);
	f32 ux = if (model_local) { x * model_rc - y * model_rs } else { x };
	f32 uy = if (model_local) { x * model_rs + y * model_rc } else { y };
	f32 vy = if (model_local) { uy * model_pc + z * model_ps } else { uy };
	f32 vz = if (model_local) { z * model_pc - uy * model_ps } else { z };
	f32 px = if (model_local) { model_x + ux * model_hc + vz * model_hs } else { ux };
	f32 py = if (model_local) { model_y + vy } else { vy };
	f32 pz = if (model_local) { model_z - ux * model_hs + vz * model_hc } else { vz };
	f32 pr = if (model_ghost) { r * 0.19 + 0.28 } else { r };
	f32 pg = if (model_ghost) { g * 0.19 + 0.72 } else { g };
	f32 pb = if (model_ghost) { b * 0.19 + 0.78 } else { b };
	if (drawing_world) {
		scenery[high][layer][row][cell][0] = px;
		scenery[high][layer][row][cell][1] = py;
		scenery[high][layer][row][cell][2] = pz;
		scenery[high][layer][row][cell][3] = pr;
		scenery[high][layer][row][cell][4] = pg;
		scenery[high][layer][row][cell][5] = pb;
	} else {
		moving_mesh[layer][row][cell][0] = px;
		moving_mesh[layer][row][cell][1] = py;
		moving_mesh[layer][row][cell][2] = pz;
		moving_mesh[layer][row][cell][3] = pr;
		moving_mesh[layer][row][cell][4] = pg;
		moving_mesh[layer][row][cell][5] = pb;
	};
};

unit(f32, f32, f32, f32, f32, f32, f32, f32, f32, f32, f32, f32) tri = fn(ax, ay, az, bx, by, bz, cx, cy, cz, r, g, b) {
	put(ax, ay, az, r, g, b);
	put(bx, by, bz, r, g, b);
	put(cx, cy, cz, r, g, b);
};

unit(f32, f32, f32, f32, f32, f32, f32, f32, f32, f32, f32, f32, f32, f32, f32) quad = fn(ax, ay, az, bx, by, bz, cx, cy, cz, dx, dy, dz, r, g, b) {
	tri(ax, ay, az, bx, by, bz, cx, cy, cz, r, g, b);
	tri(ax, ay, az, cx, cy, cz, dx, dy, dz, r, g, b);
};

unit(f32, f32, f32, f32, f32, f32, f32, f32, f32) box = fn(x, y, z, w, h, l, r, g, b) {
	f32 x1 = x+w;
	f32 y1 = y+h;
	f32 z1 = z+l;
	quad(x,y,z, x1,y,z, x1,y1,z, x,y1,z, r*0.85,g*0.85,b*0.85);
	quad(x1,y,z1, x,y,z1, x,y1,z1, x1,y1,z1, r,g,b);
	quad(x,y,z1, x,y,z, x,y1,z, x,y1,z1, r*0.77,g*0.77,b*0.77);
	quad(x1,y,z, x1,y,z1, x1,y1,z1, x1,y1,z, r*0.93,g*0.93,b*0.93);
	quad(x,y1,z, x1,y1,z, x1,y1,z1, x,y1,z1, r*1.12,g*1.12,b*1.12);
};

unit(f32, f32, f32, f32, f32, f32, f32, f32) diamond = fn(x, y, z, wide, tall, r, g, b) {
	tri(x-wide,y,z, x,y+tall,z, x,y,z+wide,r,g,b);
	tri(x,y,z+wide, x,y+tall,z, x+wide,y,z,r*0.89,g*0.89,b*0.89);
	tri(x+wide,y,z, x,y+tall,z, x,y,z-wide,r*0.77,g*0.77,b*0.77);
	tri(x,y,z-wide, x,y+tall,z, x-wide,y,z,r*0.95,g*0.95,b*0.95);
};

unit(f32, f32, f32) tree = fn(x, z, size) {
	f32 kind = sin_small(wrap((x+z)*0.007));
	f32 tall = 4.0 + size*0.22;
	f32 lean = size*kind*0.17;
	box(x-0.42,0.0,z-0.42,0.84,tall,0.84,0.34,0.25,0.17);
	if (kind>0.23) {
		diamond(x+lean,tall*0.7,z,size*0.95,size*1.92,0.18,0.40,0.25);
		diamond(x-lean,tall+size*0.61,z+size*0.12,size*0.68,size*1.43,0.27,0.51,0.31);
	} else {
		diamond(x+size*0.21,tall-size*0.27,z,size*1.13,size*1.33,0.28,0.45,0.27);
		diamond(x-size*0.36,tall+size*0.21,z-size*0.19,size*0.95,size*1.64,0.36,0.51,0.30);
	};
};

unit(f32,f32,f32,f32,f32,f32) barn_face = fn(x,z,width,base,height,shade) {
	f32 half = width*0.5;
	quad(x-half,base,z,x+half,base,z,x+half,base+height,z,x-half,base+height,z,shade,shade*0.68,shade*0.47);
};

unit(f32,f32) barn_doors = fn(x,z) {
	barn_face(x,z,9.4,0.04,8.2,0.74);
	barn_face(x,z+0.035,8.8,0.14,7.9,0.33);
	barn_face(x,z+0.065,0.23,0.13,8.1,0.81);
	quad(x-4.3,0.18,z+0.08,x-3.9,0.18,z+0.08,x+4.3,7.6,z+0.08,x+3.9,7.6,z+0.08,0.92,0.79,0.60);
	quad(x+4.3,0.18,z+0.08,x+3.9,0.18,z+0.08,x-4.3,7.6,z+0.08,x-3.9,7.6,z+0.08,0.92,0.79,0.60);
};

unit(f32, f32) barn = fn(x, z) {
	box(x-15.0,0.0,z-12.0,30.0,11.0,24.0,0.64,0.27,0.19);
	quad(x-16.0,11.0,z-13.0,x,18.0,z-13.0,x,18.0,z+13.0,x-16.0,11.0,z+13.0,0.36,0.20,0.20);
	quad(x,18.0,z-13.0,x+16.0,11.0,z-13.0,x+16.0,11.0,z+13.0,x,18.0,z+13.0,0.29,0.16,0.18);
	tri(x-15.0,11.0,z-12.0,x+15.0,11.0,z-12.0,x,18.0,z-12.0,0.72,0.36,0.24);
	tri(x-15.0,11.0,z+12.0,x+15.0,11.0,z+12.0,x,18.0,z+12.0,0.72,0.36,0.24);
	barn_doors(x,z+12.07);
	f32 rear = z-12.07;
	barn_face(x,rear,10.2,0.1,7.8,0.74);
	barn_face(x,rear-0.04,9.5,0.13,7.48,0.34);
	quad(x-4.6,0.19,rear-0.08,x-4.18,0.19,rear-0.08,x+4.6,7.3,rear-0.08,x+4.18,7.3,rear-0.08,0.90,0.79,0.61);
	quad(x+4.6,0.19,rear-0.08,x+4.18,0.19,rear-0.08,x-4.6,7.3,rear-0.08,x-4.18,7.3,rear-0.08,0.90,0.79,0.61);
	barn_face(x,z+12.03,3.0,12.9,2.7,0.32);
	barn_face(x,rear,3.0,12.9,2.7,0.32);
	quad(x-15.06,7.5,z-10.0,x-15.06,7.5,z+10.0,x-15.06,8.1,z+10.0,x-15.06,8.1,z-10.0,0.84,0.57,0.40);
	quad(x+15.06,7.5,z-10.0,x+15.06,7.5,z+10.0,x+15.06,8.1,z+10.0,x+15.06,8.1,z-10.0,0.84,0.57,0.40);
};

unit(f32,f32,f32,f32,f32,f32,f32,f32) ground_patch = fn(x,z,w,l,y,r,g,b) {
	quad(x,y,z,x+w,y,z,x+w,y,z+l,x,y,z+l,r,g,b);
};

unit(f32,f32,i32) barn_windows = fn(x,z,n) {
	if (n < 3) {
		f32 at = z-7.3+float_i(n)*6.3;
		quad(x,3.46,at, x,3.46,at+2.5, x,6.0,at+2.5, x,6.0,at, 0.84,0.68,0.46);
		quad(x+0.035,3.73,at+0.23, x+0.035,3.73,at+2.27, x+0.035,5.75,at+2.27, x+0.035,5.75,at+0.23, 0.26,0.31,0.27);
		quad(x+0.065,3.73,at+1.15, x+0.065,3.73,at+1.35, x+0.065,5.75,at+1.35, x+0.065,5.75,at+1.15, 0.76,0.62,0.42);
		barn_windows(x,z,n+1);
	};
};

unit(f32,f32,i32) grain_silo = fn(x,z,n) {
	if (n < 12) {
		f32 a = wrap(float_i(n)*0.52359879);
		f32 b = wrap(float_i(n+1)*0.52359879);
		f32 ax = x+2.72*sin_small(a);
		f32 az = z+2.72*cos_small(a);
		f32 bx = x+2.72*sin_small(b);
		f32 bz = z+2.72*cos_small(b);
		f32 shade = 0.55+0.12*cos_small(a)+float_i(n%2)*0.04;
		quad(ax,0.06,az,bx,0.06,bz,bx,13.9,bz,ax,13.9,az,shade,shade*0.98,shade*0.88);
		tri(ax,13.9,az,bx,13.9,bz,x,16.7,z,0.49,0.34,0.26);
		f32 ax_rim = x+(ax-x)*1.032;
		f32 az_rim = z+(az-z)*1.032;
		f32 bx_rim = x+(bx-x)*1.032;
		f32 bz_rim = z+(bz-z)*1.032;
		quad(ax_rim,2.28,az_rim,bx_rim,2.28,bz_rim,bx_rim,2.64,bz_rim,ax_rim,2.64,az_rim,0.38,0.37,0.32);
		quad(ax_rim,10.94,az_rim,bx_rim,10.94,bz_rim,bx_rim,11.22,bz_rim,ax_rim,11.22,az_rim,0.38,0.37,0.32);
		grain_silo(x,z,n+1);
	};
};

unit(f32,i32) harvest_rows = fn(z,n) {
	if (n < 8) {
		f32 x = -30.4+float_i(n)*3.9;
		f32 tint = float_i(n%4)*0.017;
		ground_patch(x,z+3.4,1.58,20.8,0.151,0.38+tint,0.43+tint,0.20);
		ground_patch(x+1.58,z+3.4,0.76,20.8,0.152,0.77+tint,0.66+tint,0.31);
		harvest_rows(z,n+1);
	};
};

unit(f32,f32) supply_court = fn(x,z) {
	ground_patch(x-0.30,z+10.4,8.0,14.2,0.161,0.58,0.51,0.38);
	ground_patch(x+1.22,z+11.2,0.28,12.6,0.167,0.43,0.38,0.29);
	ground_patch(x+4.87,z+11.2,0.28,12.6,0.167,0.43,0.38,0.29);
	ground_patch(x+0.52,z+10.8,5.50,0.46,0.174,0.90,0.73,0.45);
	ground_patch(x+0.52,z+23.4,5.50,0.46,0.174,0.90,0.73,0.45);
	box(x+6.10,0.17,z+11.4,1.1,0.91,2.4,0.70,0.46,0.25);
	box(x+6.22,0.17,z+14.6,1.0,0.58,1.9,0.52,0.43,0.28);
};

unit(f32,f32,i32,i32) furrows = fn(x,z,j,k) {
	if (k < 15) {
		f32 offset = 5.0 + float_i(k)*8.2;
		f32 crop = float_i((j*3+k*7)%5)*0.013;
		if (j % 3 == 0) {
			ground_patch(x+4.0,z+offset,126.0,3.8,0.033,0.46+crop,0.34+crop,0.18);
			ground_patch(x+4.0,z+offset+2.6,126.0,0.95,0.037,0.65+crop,0.51+crop,0.24);
		} else {
			ground_patch(x+offset,z+4.0,4.1,134.0,0.033,0.29+crop,0.41+crop,0.19);
			ground_patch(x+offset+1.2,z+4.0,1.0,134.0,0.037,0.47+crop,0.58+crop,0.24);
		};
		furrows(x,z,j,k+1);
	};
};

unit(f32,f32,i32) fence = fn(x,z,i) {
	f32 dx = x+float_i(i)*7.5;
	box(dx,0.0,z,0.38,2.55,0.40,0.53,0.40,0.24);
	if (i < 8) {
		box(dx,1.03,z+0.10,7.8,0.16,0.16,0.64,0.47,0.26);
		box(dx,1.90,z+0.10,7.8,0.16,0.16,0.61,0.46,0.27);
		fence(x,z,i+1);
	};
};

unit(f32,f32,i32) hay_roll = fn(x,z,i) {
	if (i < 8) {
		f32 a = wrap(float_i(i)*0.785398163);
		f32 b = wrap(a+0.785398163);
		f32 ax = x + 2.1*cos_small(a);
		f32 az = z + 2.1*sin_small(a);
		f32 bx = x + 2.1*cos_small(b);
		f32 bz = z + 2.1*sin_small(b);
		f32 light = float_i(i%3)*0.042;
		tri(x,2.39,z,ax,2.39,az,bx,2.39,bz,0.89+light,0.69+light,0.30);
		quad(ax,0.03,az,bx,0.03,bz,bx,2.39,bz,ax,2.39,az,0.74+light,0.53+light,0.21);
		hay_roll(x,z,i+1);
	};
};

unit(i32) fields = fn(j) {
	if (j < 24) {
		f32 x = float_i(j % 6)*145.0-430.0;
		f32 z = float_i(j / 6)*155.0-230.0;
		f32 tone = float_i(j*7%13)*0.009;
		quad(x,0.01,z,x+136.0,0.01,z,x+136.0,0.01,z+144.0,x,0.01,z+144.0,0.35+tone,0.52+tone,0.27+tone*0.45);
		if (j % 4 != 2) { furrows(x,z,j,0); };
		tree(x+2.0,z,3.6);
		tree(x+9.0,z+4.0,3.0);
		fields(j+1);
	};
};

f32() tower_x = fn { 228.0 };
f32() tower_z = fn { 359.0 };

bool(f32,f32) city_lot = fn(x,z) {
	!(x >= -148.0 && x <= -87.0 && z >= -265.0 && z < 55.0) && !(x == 216.0 && z == 90.0) && abs_f(z-(x*0.49+155.0)) > 58.0 && (abs_f(x-tower_x()) > 66.0 || abs_f(z-tower_z()) > 72.0) &&
	(x > -82.0 || z < -6.0 || z > 232.0) && (abs_f(x)>44.0 || z>175.0 || z< -65.0)
};

unit(f32,f32,i32,f32,f32,f32,f32,f32,f32,f32) facade_quad = fn(x,z,face,u,y,w,h,r,g,b) {
	if (face < 2) {
		f32 side = if (face == 0) { z-0.045 } else { z+27.045 };
		quad(x+u,y,side,x+u+w,y,side,x+u+w,y+h,side,x+u,y+h,side,r,g,b);
	} else {
		f32 side = if (face == 2) { x-0.045 } else { x+28.045 };
		quad(side,y,z+u,side,y,z+u+w,side,y+h,z+u+w,side,y+h,z+u,r,g,b);
	};
};

unit(f32,f32,i32,f32,i32,i32) window_row = fn(x,z,face,y,col,style) {
	if (col < 3) {
		f32 u = 4.6+float_i(col)*7.5;
		f32 navy = float_i((col+face+style)%3)*0.055;
		facade_quad(x,z,face,u,y,3.4,2.6,0.24+navy,0.34+navy,0.40+navy);
		window_row(x,z,face,y,col+1,style);
	};
};

unit(f32,f32,f32,i32,i32,i32) window_storeys = fn(x,z,height,face,floor,style) {
	f32 y = 2.7 + float_i(floor)*4.3;
	if (floor < 4 && y+2.8 < height) {
		window_row(x,z,face,y,0,style);
		facade_quad(x,z,face,4.35,y-0.32,19.0,0.32,0.94,0.80,0.63);
		window_storeys(x,z,height,face,floor+1,style);
	};
};

unit(f32,f32,f32,i32,i32) street_walls = fn(x,z,h,face,style) {
	if (face < 4) {
		window_storeys(x,z,h,face,0,style);
		facade_quad(x,z,face,0.85,0.9,0.57,h-1.15,0.90,0.77,0.60);
		facade_quad(x,z,face,25.95,0.9,0.57,h-1.15,0.90,0.77,0.60);
		facade_quad(x,z,face,1.6,h-0.65,24.0,0.48,0.86,0.71,0.56);
		facade_quad(x,z,face,1.6,0.7,24.0,0.40,0.63,0.54,0.49);
		street_walls(x,z,h,face+1,style);
	};
};

f32(i32) roof_rise = fn(style) { if (style % 3 == 1) { 4.5 } else { 2.78 } };

unit(f32,f32,f32,i32) roof = fn(x,z,h,style) {
	f32 top = h+roof_rise(style);
	f32 r = if (style % 4 == 0) { 0.59 } else { 0.40 };
	f32 g = if (style % 4 == 0) { 0.43 } else { 0.44 };
	box(x-1.0,h,z-1.0,30.0,0.52,29.0,0.79,0.70,0.53);
	quad(x-1.0,h+0.52,z-1.0,x+29.0,h+0.52,z-1.0,x+24.0,top,z+5.0,x+4.0,top,z+5.0,r,g,0.55);
	quad(x-1.0,h+0.52,z+28.0,x+29.0,h+0.52,z+28.0,x+24.0,top,z+22.0,x+4.0,top,z+22.0,r*0.83,g*0.83,0.46);
	quad(x-1.0,h+0.52,z+28.0,x-1.0,h+0.52,z-1.0,x+4.0,top,z+5.0,x+4.0,top,z+22.0,r*0.91,g*0.91,0.49);
	quad(x+29.0,h+0.52,z-1.0,x+29.0,h+0.52,z+28.0,x+24.0,top,z+22.0,x+24.0,top,z+5.0,r*0.94,g*0.94,0.50);
	quad(x+4.0,top,z+5.0,x+24.0,top,z+5.0,x+24.0,top,z+22.0,x+4.0,top,z+22.0,r*1.13,g*1.13,0.62);
	if (style % 6 == 1) {
		f32 front = z + 1.9;
		f32 dormer = h + 1.9;
		quad(x+12.3,dormer,front,x+15.7,dormer,front,x+15.7,top-0.2,front,x+12.3,top-0.2,front,0.79,0.68,0.52);
		quad(x+12.88,dormer+0.32,front-0.05,x+15.1,dormer+0.32,front-0.05,x+15.1,top-0.5,front-0.05,x+12.88,top-0.5,front-0.05,0.31,0.40,0.43);
		tri(x+11.95,top-0.25,front-0.07,x+16.08,top-0.25,front-0.07,x+14.0,top+0.91,front-0.07,r,g,0.49);
		quad(x+11.95,top-0.25,front-0.07,x+14.0,top+0.91,front-0.07,x+14.0,top+0.4,z+5.0,x+11.95,top-0.15,z+5.0,r,g,0.49);
		quad(x+16.08,top-0.25,front-0.07,x+14.0,top+0.91,front-0.07,x+14.0,top+0.4,z+5.0,x+16.08,top-0.15,z+5.0,r*0.85,g*0.85,0.42);
	};
};

unit(i32) city = fn(i) {
	if (i < 96) {
		f32 x = float_i(i%12)*56.0-344.0;
		f32 z = float_i(i/12)*59.0-205.0;
		f32 h = float_i(8+i*11%18);
		if (city_lot(x,z)) {
			f32 tint = float_i(i%4)*0.037;
			f32 stone = if (i%5 == 0) { 0.12 } else { if (i%5 == 2) { -0.07 } else { 0.0 } };
			box(x,0.0,z,28.0,h,27.0,0.76+tint*0.45+stone,0.61+tint+stone,0.49+tint*0.5+stone*0.8);
			street_walls(x,z,h,0,i);
			roof(x,z,h,i);
		};
		city(i+1);
	};
};

unit(f32,f32,f32,f32,f32,f32,f32,f32) iron_leg = fn(sx,sz,y0,y1,base,crown,wide,thin) {
	f32 ax = tower_x() + sx*base;
	f32 az = tower_z() + sz*base;
	f32 bx = tower_x() + sx*crown;
	f32 bz = tower_z() + sz*crown;
	quad(ax-wide,y0,az-wide, ax+wide,y0,az-wide, bx+thin,y1,bz-thin, bx-thin,y1,bz-thin, 0.47,0.36,0.31);
	quad(ax+wide,y0,az+wide, ax-wide,y0,az+wide, bx-thin,y1,bz+thin, bx+thin,y1,bz+thin, 0.58,0.44,0.34);
	quad(ax-wide,y0,az+wide, ax-wide,y0,az-wide, bx-thin,y1,bz-thin, bx-thin,y1,bz+thin, 0.42,0.33,0.31);
	quad(ax+wide,y0,az-wide, ax+wide,y0,az+wide, bx+thin,y1,bz+thin, bx+thin,y1,bz-thin, 0.62,0.48,0.37);
};

unit(i32,f32,f32,f32,f32,f32,f32) iron_face_vertex = fn(face,u,y,d,r,g,b) {
	f32 x = if (face == 0) { u } else { if (face == 1) { -u } else { if (face == 2) { d } else { -d } } };
	f32 z = if (face == 0) { d } else { if (face == 1) { -d } else { if (face == 2) { -u } else { u } } };
	f32 tint = if (face == 0 || face == 2) { 1.0 } else { 0.84 };
	put(tower_x()+x,y,tower_z()+z,r*tint,g*tint,b*tint);
};

unit(i32,f32,f32,f32,f32,f32,f32,f32,f32,f32) iron_band = fn(face,a,y0,d0,b,y1,d1,w,r,g) {
	iron_face_vertex(face,a-w,y0,d0,r,g,0.31);
	iron_face_vertex(face,a+w,y0,d0,r,g,0.31);
	iron_face_vertex(face,b+w,y1,d1,r,g,0.31);
	iron_face_vertex(face,a-w,y0,d0,r,g,0.31);
	iron_face_vertex(face,b+w,y1,d1,r,g,0.31);
	iron_face_vertex(face,b-w,y1,d1,r,g,0.31);
};

unit(i32,f32,f32,f32,f32,f32) iron_tie = fn(face,e,y,d,width,tint) {
	iron_face_vertex(face,-e,y,d,tint,tint*0.79,0.27);
	iron_face_vertex(face,e,y,d,tint,tint*0.79,0.27);
	iron_face_vertex(face,e,y+width,d,tint,tint*0.79,0.27);
	iron_face_vertex(face,-e,y,d,tint,tint*0.79,0.27);
	iron_face_vertex(face,e,y+width,d,tint,tint*0.79,0.27);
	iron_face_vertex(face,-e,y+width,d,tint,tint*0.79,0.27);
};

unit(i32,i32) iron_arch = fn(face,i) {
	if (i < 12) {
		f32 t0 = float_i(i)/6.0-1.0;
		f32 t1 = float_i(i+1)/6.0-1.0;
		f32 a = t0*17.6;
		f32 b = t1*17.6;
		f32 y0 = 4.4 + 14.6*(1.0-t0*t0);
		f32 y1 = 4.4 + 14.6*(1.0-t1*t1);
		f32 d0 = 20.0-y0*0.29;
		f32 d1 = 20.0-y1*0.29;
		iron_face_vertex(face,a,y0,d0,0.58,0.43,0.32);
		iron_face_vertex(face,b,y1,d1,0.58,0.43,0.32);
		iron_face_vertex(face,b,y1+2.05,d1-0.47,0.64,0.48,0.35);
		iron_face_vertex(face,a,y0,d0,0.58,0.43,0.32);
		iron_face_vertex(face,b,y1+2.05,d1-0.47,0.64,0.48,0.35);
		iron_face_vertex(face,a,y0+2.05,d0-0.47,0.64,0.48,0.35);
		iron_arch(face,i+1);
	};
};

unit(i32,f32,f32,f32,f32,f32) iron_lattice = fn(face,y0,y1,e0,e1,width) {
	iron_band(face,-e0,y0,e0,e1,y1,e1,width,0.64,0.49);
	iron_band(face,e0,y0,e0+0.13,-e1,y1,e1+0.13,width,0.52,0.42);
	iron_tie(face,(e0+e1)*0.5,(y0+y1)*0.5,(e0+e1)*0.5+0.29,width,0.53);
};

unit(i32) tower_faces = fn(face) {
	if (face < 4) {
		iron_arch(face,0);
		iron_lattice(face,25.4,42.3,11.8,6.5,0.42);
		iron_lattice(face,45.1,52.0,5.9,4.35,0.29);
		iron_lattice(face,52.0,57.0,4.35,3.2,0.24);
		iron_lattice(face,57.0,63.8,3.2,2.42,0.19);
		iron_lattice(face,63.8,70.0,2.42,1.8,0.15);
		tower_faces(face+1);
	};
};

unit(f32,f32) tower_corner = fn(sx,sz) {
	box(tower_x()+sx*18.0-4.0,0.0,tower_z()+sz*18.0-4.0,8.0,2.35,8.0,0.52,0.43,0.35);
	iron_leg(sx,sz,2.35,11.0,18.0,15.6,2.9,2.43);
	iron_leg(sx,sz,11.0,23.4,15.6,12.5,2.43,1.87);
	iron_leg(sx,sz,25.2,43.0,11.9,6.3,1.66,1.18);
	iron_leg(sx,sz,44.8,57.0,5.95,3.2,1.03,0.66);
	iron_leg(sx,sz,57.0,70.5,3.2,1.77,0.66,0.43);
};

unit(f32,f32,f32) tower_deck = fn(y,half,h) {
	box(tower_x()-half,y,tower_z()-half,half*2.0,h,half*2.0,0.43,0.34,0.30);
	f32 ring = half+0.28;
	box(tower_x()-ring,y+h,tower_z()-ring,ring*2.0,0.44,ring*2.0,0.66,0.52,0.36);
	box(tower_x()-ring,y+h+0.44,tower_z()-ring,ring*2.0,0.8,0.22,0.52,0.42,0.32);
	box(tower_x()-ring,y+h+0.44,tower_z()+ring-0.22,ring*2.0,0.8,0.22,0.52,0.42,0.32);
	box(tower_x()-ring,y+h+0.44,tower_z()-ring+0.22,0.22,0.8,ring*2.0-0.44,0.52,0.42,0.32);
	box(tower_x()+ring-0.22,y+h+0.44,tower_z()-ring+0.22,0.22,0.8,ring*2.0-0.44,0.52,0.42,0.32);
};

unit() tower = fn {
	ground_patch(tower_x()-23.0,tower_z()-23.0,46.0,46.0,0.08,0.78,0.73,0.60);
	tower_corner(1.0,1.0);
	tower_corner(-1.0,1.0);
	tower_corner(1.0,-1.0);
	tower_corner(-1.0,-1.0);
	tower_faces(0);
	tower_deck(23.35,15.1,1.53);
	tower_deck(42.45,8.07,2.0);
	tower_deck(69.65,3.0,1.17);
	box(tower_x()-1.48,71.27,tower_z()-1.48,2.96,4.5,2.96,0.56,0.44,0.33);
	diamond(tower_x(),75.78,tower_z(),2.38,2.4,0.46,0.40,0.30);
	box(tower_x()-0.37,77.0,tower_z()-0.37,0.74,6.46,0.74,0.46,0.39,0.33);
	diamond(tower_x(),83.45,tower_z(),0.44,0.55,0.68,0.53,0.36);
};

f32() strip_x = fn { map_plan.finish.x };
f32() strip_z = fn { map_plan.finish.z };
f32() strip_w = fn { map_plan.finish.width };
f32() strip_l = fn { map_plan.finish.length };
f32() drop_x = fn { 109.0 };
f32() drop_z = fn { 218.0 };

f32() pickup_x = fn { map_plan.supply.x };
f32() pickup_z = fn { map_plan.supply.z };
f32() pickup_w = fn { map_plan.supply.width };
f32() pickup_l = fn { map_plan.supply.length };
f32() service_x = fn { pickup_x()+pickup_w()*0.5+4.0 };
f32() service_z = fn { pickup_z()+45.0 };
f32() service_w = fn { 7.0 };
f32() service_h = fn { 4.32 };
f32() service_l = fn { 10.0 };
f32() home_x = fn { map_plan.home.x };
f32() home_z = fn { map_plan.home.z };
f32() home_w = fn { map_plan.home.width };
f32() home_l = fn { map_plan.home.length };
f32(i32) crop_z = fn(i) { 185.0+40.0*float_i(i) };
f32(i32) gate_x = fn(i) { if (i == 0 || course == 0) { pickup_x() } else { if (i == 1) { 5.0 } else { 89.0 } } };
f32(i32) gate_z = fn(i) {
	if (i == 0) { pickup_z()-28.0 } else {
		if (course == 0) { if (i == 1) { 160.0 } else { 298.0 } } else { if (i == 1) { 167.0 } else { 204.0 } }
	}
};
i32(i32) gate_deadline = fn(i) {
	if (i == 0) { 238 } else {
		if (course == 0) { if (i == 1) { 471 } else { 694 } } else { if (i == 1) { 765 } else { 901 } }
	}
};
f32(i32) gate_y = fn(i) { if (i == 0) { 5.0 } else { if (course == 0) { 9.5 } else { 15.5 } } };

unit(f32,f32,f32,f32,i32) service_marks = fn(x,z,w,l,n) {
	if (n < 8) {
		f32 mark_z = z+4.0+float_i(n)*l/8.0;
		ground_patch(x-w*0.46,mark_z,0.58,2.4,0.23,0.34,0.94,0.81);
		ground_patch(x+w*0.46-0.58,mark_z,0.58,2.4,0.23,0.34,0.94,0.81);
		ground_patch(x-0.43,mark_z,0.86,1.7,0.23,0.84,0.95,0.82);
		service_marks(x,z,w,l,n+1);
	};
};

unit(f32,f32,f32,f32) service_runway = fn(x,z,w,l) {
	box(x-w*0.5,0.13,z,w,0.07,l,0.27,0.37,0.33);
	ground_patch(x-w*0.42,z+5.0,w*0.84,1.2,0.23,0.32,0.92,0.80);
	service_marks(x,z,w,l,0);
};

unit(i32) crop_markers = fn(n) {
	if (n < 3) {
		f32 z = crop_z(n);
		ground_patch(-31.0,z,32.0,27.0,0.14,0.51+0.045*float_i(n),0.64,0.25);
		ground_patch(-30.2,z+2.0,30.4,1.0,0.15,0.92,0.79,0.36);
		ground_patch(-30.2,z+24.0,30.4,1.0,0.15,0.92,0.79,0.36);
		harvest_rows(z,0);
		crop_markers(n+1);
	};
};

unit(f32,f32,f32,i32,i32) gate_arch = fn(x,y,z,n,status) {
	if (n < 14) {
		f32 start = float_i(n)*0.44879895-3.14159265;
		f32 low = if (status != 0) { start } else { start+0.044 };
		f32 high = if (status != 0) { wrap(start+0.44879895) } else { wrap(start+0.44879895-0.044) };
		f32 ss = sin_small(low);
		f32 cs = cos_small(low);
		f32 es = sin_small(high);
		f32 ec = cos_small(high);
		f32 r = if (status == 0) { 1.0 } else { if (status == 1) { 0.22 } else { 0.23 } };
		f32 g = if (status == 0) { 0.66 } else { if (status == 1) { 1.0 } else { 0.58 } };
		f32 b = if (status == 0) { 0.19 } else { 0.43 };
		quad(x+ss*9.5,y+cs*5.3,z,x+es*9.5,y+ec*5.3,z,x+es*9.1,y+ec*4.93,z,x+ss*9.1,y+cs*4.93,z,r,g,b);
		gate_arch(x,y,z,n+1,status);
	};
};

unit(i32) runway_marks = fn(n) {
	if (n < 10) {
		f32 z = strip_z() + strip_l()*0.055 + float_i(n) * strip_l()/10.0;
		box(strip_x()-0.9,0.25,z,1.8,0.03,strip_l()*0.042,0.95,0.89,0.69);
		box(strip_x()-strip_w()/2.0-0.3,0.20,z,0.6,0.13,strip_l()*0.034,0.92,0.74,0.31);
		box(strip_x()+strip_w()/2.0-0.3,0.20,z,0.6,0.13,strip_l()*0.034,0.92,0.74,0.31);
		runway_marks(n+1);
	};
};

unit() runway = fn {
	f32 x = strip_x();
	f32 z = strip_z();
	f32 w = strip_w();
	f32 l = strip_l();
	box(x-w/2.0,0.14,z,w,0.12,l,0.42,0.40,0.34);
	box(x-w/2.0+1.0,0.28,z+7.0,w-2.0,0.10,2.0,0.93,0.83,0.61);
	box(x-w/2.0+1.0,0.28,z+l-10.0,w-2.0,0.10,2.0,0.93,0.83,0.61);
	runway_marks(0);
};

unit() mail_landmarks = fn {
	f32 x = drop_x();
	f32 z = drop_z();
	ground_patch(x-10.0,z-10.0,20.0,20.0,0.18,0.22,0.40,0.44);
	ground_patch(x-5.0,z-0.6,10.0,1.2,0.21,0.96,0.70,0.29);
	ground_patch(x-0.6,z-5.0,1.2,10.0,0.22,0.96,0.70,0.29);
	box(x-6.0,0.21,z-6.0,0.35,4.0,0.35,0.83,0.76,0.60);
	box(x+5.65,0.21,z-6.0,0.35,4.0,0.35,0.83,0.76,0.60);
	box(x-6.0,4.30,z-6.0,2.1,0.95,0.14,0.97,0.62,0.24);
	box(x+4.0,4.30,z-6.0,2.0,0.95,0.14,0.97,0.62,0.24);
	ground_patch(4.0,142.0,8.0,3.4,0.13,0.23,0.91,0.95);
	ground_patch(20.0,154.0,8.0,3.4,0.13,0.23,0.91,0.95);
	ground_patch(37.0,166.0,8.0,3.4,0.13,0.23,0.91,0.95);
	ground_patch(14.0,131.0,8.0,3.4,0.13,0.98,0.76,0.36);
	ground_patch(36.0,146.0,8.0,3.4,0.13,0.98,0.76,0.36);
	ground_patch(61.0,157.0,8.0,3.4,0.13,0.98,0.76,0.36);
	ground_patch(80.0,173.0,8.0,3.4,0.13,0.98,0.76,0.36);
};

unit(f32,f32,i32) bank_details = fn(x,z,i) {
	if (i < 27) {
		f32 cx = x+float_i(i)*24.0;
		f32 cz = z+float_i(i)*11.76;
		ground_patch(cx,cz,1.0,2.8,0.077,0.57,0.52,0.43);
		if (i < 4 || i > 23) { tree(cx,cz+5.0,3.1); };
		bank_details(x,z,i+1);
	};
};

unit(f32,f32,f32,f32) promenade = fn(x0,z0,x1,z1) {
	quad(x0,0.063,z0,x1,0.063,z1,x1,0.063,z1+5.2,x0,0.063,z0+5.2,0.77,0.70,0.56);
	quad(x0,0.071,z0+1.2,x1,0.071,z1+1.2,x1,0.071,z1+1.75,x0,0.071,z0+1.75,0.89,0.82,0.67);
};

unit(f32,f32,f32,i32) bridge_stones = fn(x,z,w,i) {
	if (i < 6) {
		f32 start = z+3.0+float_i(i)*19.0;
		f32 end = start+12.4;
		quad(x-0.012,0.7,start,x-0.012,0.7,end,x-0.012,2.7,end-1.5,x-0.012,2.7,start+1.5,0.48,0.44,0.42);
		quad(x+w+0.012,0.7,start,x+w+0.012,0.7,end,x+w+0.012,2.7,end-1.5,x+w+0.012,2.7,start+1.5,0.48,0.44,0.42);
		bridge_stones(x,z,w,i+1);
	};
};

unit(f32,f32,f32) bridge = fn(x,z,w) {
	box(x,0.30,z,w,3.65,119.0,0.76,0.66,0.51);
	box(x,3.95,z,0.76,0.35,119.0,0.58,0.49,0.45);
	box(x+w-0.76,3.95,z,0.76,0.35,119.0,0.58,0.49,0.45);
	box(x+w*0.46,3.95,z,w*0.08,0.03,119.0,0.87,0.80,0.64);
	bridge_stones(x,z,w,0);
};

unit(i32) bridge_masonry = fn(course_stone) {
	if (course_stone < 14) {
		f32 left_joint = 174.8+float_i(course_stone)*8.10;
		f32 right_joint = left_joint+7.74;
		f32 warm = if (course_stone % 3 == 0) { 0.72 } else { 0.65 };
		quad(53.985,5.60,left_joint,53.985,5.60,right_joint,53.985,7.11,right_joint-0.39,53.985,7.11,left_joint+0.39,warm,warm*0.88,warm*0.74);
		quad(64.015,5.60,left_joint,64.015,5.60,right_joint,64.015,7.11,right_joint-0.39,64.015,7.11,left_joint+0.39,warm,warm*0.88,warm*0.74);
		if (course_stone < 13) {
			f32 cap_start = left_joint+4.05;
			quad(53.982,7.29,cap_start,53.982,7.29,cap_start+7.76,53.982,8.60,cap_start+7.76,53.982,8.60,cap_start,0.76,0.67,0.54);
			quad(64.018,7.29,cap_start,64.018,7.29,cap_start+7.76,64.018,8.60,cap_start+7.76,64.018,8.60,cap_start,0.71,0.61,0.48);
		};
		bridge_masonry(course_stone+1);
	};
};

f32(f32) upstream_bank = fn(px) { -117.0+(px+450.0)*0.49 };

unit(i32) quay_steps = fn(station) {
	if (station < 8) {
		f32 quay_x = 78.0+float_i(station)*9.0;
		f32 lip_z = upstream_bank(quay_x)-1.2;
		f32 sand_end = upstream_bank(quay_x+8.65)-1.2;
		quad(quay_x,0.086,lip_z,quay_x+8.65,0.086,sand_end,quay_x+8.65,0.086,sand_end-1.55,quay_x,0.086,lip_z-1.55,0.84,0.75,0.60);
		quad(quay_x,0.135,lip_z-1.55,quay_x+8.65,0.135,sand_end-1.55,quay_x+8.65,0.135,sand_end-2.9,quay_x,0.135,lip_z-2.9,0.68,0.61,0.52);
		quad(quay_x,0.084,lip_z-1.55,quay_x+8.65,0.084,sand_end-1.55,quay_x+8.65,0.135,sand_end-1.55,quay_x,0.135,lip_z-1.55,0.47,0.43,0.39);
		if (station % 2 == 0) { box(quay_x+1.0,0.13,lip_z-3.3,0.49,0.61,0.46,0.29,0.31,0.29); };
		quay_steps(station+1);
	};
};

f32(i32,i32) ridge_height = fn(layer,point) {
	f32 key = float_i(point);
	f32 wave = sin_small(wrap((key-10.0)*0.36))*0.69 + sin_small(wrap((key-8.0)*0.65))*0.31;
	if (course == 0) {
		if (layer == 0) { 34.0+wave*18.0 } else { 19.0+wave*11.0 }
	} else {
		if (layer == 0) { 22.0+wave*9.0 } else { 10.0+wave*4.0 }
	}
};

unit(i32,i32) distant_hills = fn(layer,n) {
	if (n < 20) {
		f32 x = -600.0+float_i(n)*60.0;
		f32 base = if (layer == 0) { 616.0 } else { 569.0 };
		f32 height = ridge_height(layer,n);
		f32 next = ridge_height(layer,n+1);
		f32 green = if (course == 0) { 0.49 } else { 0.54 };
		f32 shade = if (layer == 0) { 0.09 } else { 0.0 };
		f32 offset = float_i(n%3)*5.1;
		f32 next_offset = float_i((n+1)%3)*5.1;
		quad(x,0.0,base-29.0,x+60.0,0.0,base-29.0,x+60.0,next*0.55,base-13.0+next_offset,x,height*0.55,base-13.0+offset,0.40+shade,green+shade,0.47+shade);
		quad(x,height*0.55,base-13.0+offset,x+60.0,next*0.55,base-13.0+next_offset,x+60.0,next,base+next_offset,x,height,base+offset,0.44+shade,green+shade,0.53+shade);
		distant_hills(layer,n+1);
	};
};

unit(i32) forage_edges = fn(n) {
	if (n < 30) {
		f32 d = float_i(n)*13.0;
		f32 wiggle = float_i((n*11)%31)-15.0;
		f32 size = 1.4+float_i((n*7)%18)*0.20;
		tree(-121.0+wiggle*0.41,-43.0+d,size);
		tree(169.0+wiggle*0.57,-53.0+d,size*0.91);
		forage_edges(n+1);
	};
};

unit(f32,f32) river_boat = fn(x,z) {
	quad(x-5.0,0.13,z-14.0,x+5.0,0.13,z-14.0,x+5.0,0.13,z+14.0,x-5.0,0.13,z+14.0,0.40,0.56,0.61);
	box(x-3.4,0.12,z-12.0,6.8,1.3,24.0,0.31,0.24,0.29);
	tri(x-3.4,1.43,z+12.0,x+3.4,1.43,z+12.0,x,1.43,z+17.0,0.50,0.32,0.26);
	box(x-2.4,1.47,z-6.0,4.8,1.94,7.0,0.83,0.74,0.60);
	box(x-2.57,3.43,z-6.16,5.14,0.22,7.32,0.37,0.29,0.23);
	box(x-1.9,2.18,z+1.04,3.8,0.51,0.08,0.33,0.44,0.49);
	box(x-0.21,3.65,z-4.3,0.42,2.10,0.43,0.29,0.28,0.24);
};

unit(f32,f32,f32,f32,i32) quay_windows = fn(x,z,y,width,n) {
	if (n < 7) {
		f32 left = x+(float_i(n)+0.28)*width/7.0;
		f32 right = left+width*0.067;
		quad(left,y,z,right,y,z,right,y+3.8,z,left,y+3.8,z,0.24,0.42,0.48);
		quad(left,y+1.82,z-0.006,right,y+1.82,z-0.006,right,y+1.96,z-0.006,left,y+1.96,z-0.006,0.90,0.79,0.59);
		quay_windows(x,z,y,width,n+1);
	};
};

unit() quay_station = fn {
	f32 x = paris.station_x();
	f32 z = paris.station_z();
	f32 w = paris.station_width();
	f32 l = paris.station_length();
	f32 eaves = paris.station_eaves();
	f32 ridge = paris.station_ridge();
	f32 middle = x+w*0.5;
	ground_patch(x-9.0,z-7.0,w+18.0,l+12.0,0.074,0.68,0.63,0.52);
	ground_patch(x-10.0,z+l+6.0,w+20.0,1.4,0.079,0.56,0.50,0.43);
	box(x,0.0,z,w,eaves,l,0.76,0.64,0.48);
	tri(x,eaves,z,x+w,eaves,z,middle,ridge,z,0.77,0.65,0.48);
	tri(x+w,eaves,z+l,x,eaves,z+l,middle,ridge,z+l,0.71,0.59,0.43);
	quad(x,eaves,z,x,eaves,z+l,middle,ridge,z+l,middle,ridge,z,0.34,0.38,0.42);
	quad(middle,ridge,z,middle,ridge,z+l,x+w,eaves,z+l,x+w,eaves,z,0.45,0.47,0.46);
	quay_windows(x,z-0.018,5.2,w,0);
	quad(middle-2.3,0.15,z-0.018,middle+2.3,0.15,z-0.018,middle+2.3,4.0,z-0.018,middle-2.3,4.0,z-0.018,0.30,0.28,0.27);
	quad(middle-6.8,9.5,z-0.018,middle+6.8,9.5,z-0.018,middle+6.8,10.35,z-0.018,middle-6.8,10.35,z-0.018,0.92,0.81,0.57);
};

unit(f32,f32,f32,f32,f32,f32) seine_reach = fn(x0,a0,b0,x1,a1,b1) {
	quad(x0,0.025,a0,x1,0.025,a1,x1,0.025,b1,x0,0.025,b0,0.29,0.52,0.67);
	quad(x0,0.055,a0,x1,0.055,a1,x1,0.055,a1-5.0,x0,0.055,a0-5.0,0.73,0.69,0.55);
	quad(x0,0.055,b0,x1,0.055,b1,x1,0.055,b1+5.0,x0,0.055,b0+5.0,0.73,0.69,0.55);
	promenade(x0,a0-8.0,x1,a1-8.0);
	promenade(x0,b0+6.0,x1,b1+6.0);
};

unit(f32,f32,f32,f32,i32) reservoir_bank = fn(x,z,w,l,n) {
	if (n < 16) {
		f32 a = wrap(float_i(n)*0.39269908);
		f32 b = wrap(float_i(n+1)*0.39269908);
		f32 ux = sin_small(a);
		f32 uz = cos_small(a);
		f32 vx = sin_small(b);
		f32 vz = cos_small(b);
		f32 ix0 = x+w*ux;
		f32 iz0 = z+l*uz;
		f32 ix1 = x+w*vx;
		f32 iz1 = z+l*vz;
		tri(x,0.105,z,ix0,0.105,iz0,ix1,0.105,iz1,0.23,0.48,0.54);
		quad(ix0,0.105,iz0,ix1,0.105,iz1,x+(w+3.0)*vx,0.66,z+(l+3.0)*vz,x+(w+3.0)*ux,0.66,z+(l+3.0)*uz,0.52,0.51,0.39);
		quad(x+(w+3.0)*ux,0.66,z+(l+3.0)*uz,x+(w+3.0)*vx,0.66,z+(l+3.0)*vz,x+(w+6.0)*vx,0.0,z+(l+6.0)*vz,x+(w+6.0)*ux,0.0,z+(l+6.0)*uz,0.61,0.61,0.48);
		reservoir_bank(x,z,w,l,n+1);
	};
};

unit(f32,f32,i32) county_tank = fn(x,z,n) {
	if (n < 12) {
		f32 a = wrap(float_i(n)*0.52359879);
		f32 b = wrap(float_i(n+1)*0.52359879);
		f32 x0 = x+7.0*sin_small(a);
		f32 z0 = z+7.0*cos_small(a);
		f32 x1 = x+7.0*sin_small(b);
		f32 z1 = z+7.0*cos_small(b);
		f32 band = if (n%2 == 0) { 0.04 } else { 0.0 };
		quad(x0,20.0,z0,x1,20.0,z1,x1,28.0,z1,x0,28.0,z0,0.67+band,0.67+band,0.60+band);
		tri(x0,28.0,z0,x1,28.0,z1,x,32.0,z,0.43,0.27,0.19);
		tri(x0,20.0,z0,x1,20.0,z1,x,17.1,z,0.46,0.45,0.39);
		county_tank(x,z,n+1);
	};
};

unit() county_reservoir = fn {
	f32 x = wright.reservoir_x();
	f32 z = wright.reservoir_z();
	f32 ux = wright.reservoir_tower_x();
	f32 uz = wright.reservoir_tower_z();
	reservoir_bank(x,z,wright.reservoir_width(),wright.reservoir_length(),0);
	ground_patch(ux-10.0,z+42.0,x-ux+56.0,5.0,0.082,0.60,0.53,0.40);
	ground_patch(ux-2.5,uz-15.0,5.0,z+42.0-uz+15.0,0.087,0.57,0.49,0.37);
	ground_patch(ux-11.0,uz-11.0,22.0,22.0,0.094,0.65,0.60,0.46);
	box(ux-5.8,0.0,uz-5.8,1.2,21.0,1.2,0.37,0.30,0.24);
	box(ux+4.6,0.0,uz-5.8,1.2,21.0,1.2,0.37,0.30,0.24);
	box(ux-5.8,0.0,uz+4.6,1.2,21.0,1.2,0.37,0.30,0.24);
	box(ux+4.6,0.0,uz+4.6,1.2,21.0,1.2,0.37,0.30,0.24);
	quad(ux-5.2,2.0,uz-5.84,ux+5.2,15.6,uz-5.84,ux+5.2,16.4,uz-5.84,ux-5.2,2.8,uz-5.84,0.45,0.36,0.29);
	quad(ux+5.2,2.0,uz-5.84,ux-5.2,15.6,uz-5.84,ux-5.2,16.4,uz-5.84,ux+5.2,2.8,uz-5.84,0.45,0.36,0.29);
	county_tank(ux,uz,0);
};

unit() render_land = fn {
	vertex_count = 0;
	drawing_world = true;
	model_local = false;
	model_ghost = false;
	if (course == 0) {
		quad(-480.0,0.0,-350.0,480.0,0.0,-350.0,480.0,0.0,570.0,-480.0,0.0,570.0,0.44,0.58,0.31);
		fields(0);
		forage_edges(0);
		barn(145.0,97.0);
		barn(-61.0,164.0);
		barn_windows(160.085,97.0,0);
		barn_windows(-45.915,164.0,0);
		grain_silo(166.5,114.5,0);
		box(-100.0,0.05,132.0,270.0,0.10,6.0,0.63,0.53,0.34);
		box(54.0,0.05,-52.0,7.0,0.10,343.0,0.57,0.48,0.33);
		fence(70.0,127.0,0);
		fence(-245.0,44.0,0);
		hay_roll(-232.0,31.0,0);
		hay_roll(-223.0,29.0,0);
		hay_roll(-217.0,33.0,0);
		hay_roll(190.0,119.0,0);
		county_reservoir();
	} else {
		quad(-450.0,0.0,-320.0,450.0,0.0,-320.0,450.0,0.0,570.0,-450.0,0.0,570.0,0.54,0.62,0.47);
		seine_reach(-450.0,-117.0,-14.0,330.0,265.2,368.2);
		seine_reach(330.0,265.2,368.2,450.0,430.0,533.0);
		quay_station();
		bank_details(-400.0,-98.0,0);
		bank_details(-400.0,18.5,0);
		bridge(54.0,172.0,10.0);
		box(54.0,4.30,172.0,10.0,4.70,119.0,0.69,0.60,0.50);
		box(54.0,9.00,172.0,0.65,0.35,119.0,0.80,0.70,0.58);
		box(63.35,9.00,172.0,0.65,0.35,119.0,0.80,0.70,0.58);
		bridge(158.0,221.0,12.0);
		bridge_masonry(0);
		quay_steps(0);
		city(0);
		tower();
		mail_landmarks();
		river_boat(-212.0,60.0);
		river_boat(285.0,300.0);
	};
	distant_hills(0,0);
	distant_hills(1,0);
	runway();
	service_runway(home_x(),home_z(),home_w(),home_l());
	service_runway(pickup_x(),pickup_z(),pickup_w(),pickup_l());
	f32 stop_z = pickup_z()+pickup_l()-34.0;
	ground_patch(pickup_x()-pickup_w()*0.46,stop_z,0.85*pickup_w(),0.83,0.26,0.94,0.56,0.26);
	f32 sx = service_x();
	f32 sz = service_z();
	box(sx,0.0,sz,service_w(),service_h()-0.32,service_l(),0.38,0.38,0.31);
	box(sx-0.4,service_h()-0.32,sz-0.4,service_w()+0.8,0.32,service_l()+0.8,0.41,0.61,0.54);
	box(sx-0.1,0.2,sz+2.0,0.10,2.1,4.8,0.82,0.72,0.42);
	if (course == 0) {
		supply_court(sx,sz);
		crop_markers(0);
	};
	if (course == 1) {
		box(sx+1.0,4.34,sz+3.0,5.0,2.2,3.8,0.83,0.31,0.15);
		quad(sx+1.5,4.76,sz+2.97,sx+5.5,4.76,sz+2.97,sx+5.5,6.15,sz+2.97,sx+1.5,6.15,sz+2.97,0.97,0.92,0.76);
		tri(sx+1.5,6.15,sz+2.94,sx+5.5,6.15,sz+2.94,sx+3.5,5.26,sz+2.94,0.73,0.39,0.22);
	} else {
		box(sx+1.2,4.34,sz+3.0,4.6,2.4,4.3,0.18,0.74,0.57);
		box(sx+2.7,6.74,sz+4.4,1.6,0.7,1.5,0.96,0.84,0.42);
		box(sx+4.9,5.1,sz+2.4,1.8,0.24,0.52,0.96,0.84,0.42);
	};
	i32 count = vertex_count * 6;
	unsafe { host.world(core.pointer_cast<*?u8>(&?scenery[0][0][0][0][0]), count); };
};

unit(f32,f32,i32) wing_post = fn(x,z,kind) {
	f32 h = if (kind == 0) { 1.40 } else { 1.6 };
	box(x-0.055,-0.35,z-0.055,0.11,h,0.11,0.46,0.31,0.16);
};

unit(f32,f32,f32,f32,f32,f32,f32,f32,f32) cloth_sides = fn(x,y,z,w,h,l,r,g,b) {
	f32 x1 = x+w;
	f32 y1 = y+h;
	f32 z1 = z+l;
	quad(x,y,z,x1,y,z,x1,y1,z,x,y1,z,r*0.85,g*0.85,b*0.85);
	quad(x1,y,z1,x,y,z1,x,y1,z1,x1,y1,z1,r,g,b);
	quad(x,y,z1,x,y,z,x,y1,z,x,y1,z1,r*0.77,g*0.77,b*0.77);
	quad(x1,y,z,x1,y,z1,x1,y1,z1,x1,y1,z,r*0.93,g*0.93,b*0.93);
};

unit(f32,f32,f32,f32,f32,f32,f32,f32) flag_rect = fn(x,y,z,w,l,r,g,b) {
	quad(x,y,z,x+w,y,z,x+w,y,z+l,x,y,z+l,r,g,b);
};

unit(f32,f32,f32,f32) flag_star = fn(x,y,z,size) {
	quad(x-size,y,z,x,y,z-size,x+size,y,z,x,y,z+size,0.97,0.97,0.9);
};

unit(f32,f32,f32,f32,i32) flag_globe = fn(x,y,z,radius,index) {
	if (index < 16) {
		f32 a = wrap(float_i(index) * 0.39269908);
		f32 b = wrap(float_i(index+1) * 0.39269908);
		tri(x,y,z,x+sin_small(a)*radius,y,z+cos_small(a)*radius,
			x+sin_small(b)*radius,y,z+cos_small(b)*radius,0.028,0.248,0.63);
		flag_globe(x,y,z,radius,index+1);
	};
};

unit(f32,f32,f32,f32,f32) brazilian_flag = fn(x,y,z,w,l) {
	flag_rect(x,y,z,w,l,0.035,0.59,0.25);
	f32 cx = x+w*0.5;
	f32 cz = z+l*0.5;
	f32 gold = y+0.025;
	quad(cx-w*0.44,gold,cz,cx,gold,cz-l*0.43,cx+w*0.44,gold,cz,cx,gold,cz+l*0.43,1.0,0.84,0.12);
	f32 blue = y+0.050;
	f32 radius = l*0.262;
	flag_globe(cx,blue,cz,radius,0);
	f32 band = y+0.075;
	quad(cx-radius*0.86,band,cz+radius*0.36,cx-radius*0.32,band,cz+radius*0.10,
		cx-radius*0.32,band,cz+radius*0.27,cx-radius*0.86,band,cz+radius*0.52,0.98,0.96,0.83);
	quad(cx-radius*0.32,band,cz+radius*0.10,cx+radius*0.31,band,cz-radius*0.17,
		cx+radius*0.31,band,cz+radius*0.00,cx-radius*0.32,band,cz+radius*0.27,0.98,0.96,0.83);
	quad(cx+radius*0.31,band,cz-radius*0.17,cx+radius*0.88,band,cz-radius*0.27,
		cx+radius*0.88,band,cz-radius*0.12,cx+radius*0.31,band,cz+radius*0.00,0.98,0.96,0.83);
	flag_star(cx-radius*0.47,band,cz-radius*0.36,radius*0.066);
	flag_star(cx+radius*0.05,band,cz-radius*0.51,radius*0.052);
	flag_star(cx+radius*0.44,band,cz+radius*0.32,radius*0.069);
	flag_star(cx+radius*0.02,band,cz+radius*0.58,radius*0.046);
};

unit(f32,f32,f32,f32,f32,i32) usa_stripes = fn(x,y,z,w,l,index) {
	if (index < 13) {
		f32 left = if (index < 7) { w*0.43 } else { 0.0 };
		f32 start = z+l*float_i(index)/13.0;
		f32 end = z+l*float_i(index+1)/13.0;
		bool red = index % 2 == 0;
		f32 color = if (red) { 0.18 } else { 0.95 };
		quad(x+left,y,start,x+w,y,start,x+w,y,end,x+left,y,end,0.94,color,color);
		usa_stripes(x,y,z,w,l,index+1);
	};
};

unit(f32,f32,f32,f32,f32,i32) usa_stars = fn(x,y,z,w,l,index) {
	if (index < 9) {
		f32 offset_x = w*(0.19+0.30*float_i(index%3)+0.04*float_i(index/3%2));
		f32 offset_z = l*(0.19+0.30*float_i(index/3));
		flag_star(x+offset_x,y,z+offset_z,l*0.057);
		usa_stars(x,y,z,w,l,index+1);
	};
};

unit() american_flag = fn {
	f32 x = 0.68;
	f32 y = 1.149;
	f32 z = -0.73;
	f32 w = 3.81;
	f32 l = 1.58;
	f32 canton_w = w*0.43;
	f32 canton_l = l*7.0/13.0;
	flag_rect(x,y,z,canton_w,canton_l,0.095,0.24,0.64);
	usa_stripes(x,y,z,w,l,0);
	usa_stars(x,y+0.024,z,canton_w,canton_l,0);
};

unit() paris_steering_surfaces = fn {
	cloth_sides(-4.74,1.01,-1.57,9.48,0.15,1.50,0.9,0.94,0.86);
	quad(-4.74,1.16,-1.57,4.74,1.16,-1.57,4.74,1.16,-1.30,-4.74,1.16,-1.30,0.27,0.46,0.37);
	quad(-4.74,1.16,-1.30,4.74,1.16,-1.30,4.74,1.16,-0.07,-4.74,1.16,-0.07,0.96,0.96,0.86);
	brazilian_flag(0.48,1.19,-1.245,3.96,1.11);
	cloth_sides(-1.40,0.99,2.34,2.80,0.16,1.64,0.54,0.70,0.43);
};

unit(i32) plane_model = fn(kind) {
	if (kind == 0) {
		box(-4.85,-0.49,-0.85,9.70,0.19,1.80,0.91,0.76,0.48);
		box(-4.85,0.93,-0.85,9.70,0.19,1.80,0.98,0.83,0.58);
		american_flag();
		wing_post(-4.15,-0.58,kind); wing_post(4.15,-0.58,kind); wing_post(-4.15,0.53,kind); wing_post(4.15,0.53,kind);
		wing_post(-2.20,-0.58,kind); wing_post(2.20,-0.58,kind); wing_post(-2.20,0.53,kind); wing_post(2.20,0.53,kind);
		wing_post(-0.65,0.26,kind); wing_post(0.65,0.26,kind);
		box(-0.68,-0.84,-1.66,0.12,0.16,3.36,0.38,0.25,0.16);
		box(0.55,-0.84,-1.66,0.12,0.16,3.36,0.38,0.25,0.16);
		box(-1.50,-0.18,2.52,3.00,0.12,0.71,0.98,0.85,0.61);
		box(-1.50,0.49,2.52,3.00,0.12,0.71,0.96,0.80,0.53);
		box(-0.48,-0.37,-2.76,0.12,0.92,0.77,0.89,0.73,0.52);
		box(0.36,-0.37,-2.76,0.12,0.92,0.77,0.89,0.73,0.52);
		box(-0.42,-0.28,-0.32,0.84,0.46,0.96,0.32,0.24,0.19);
		diamond(0.0,0.13,0.40,0.24,0.32,0.42,0.32,0.24);
	} else {
		box(-4.74,-0.49,-1.57,9.48,0.14,1.50,0.80,0.83,0.75);
		box(-4.80,-0.40,-1.40,0.13,1.47,1.17,0.28,0.49,0.60);
		box(4.67,-0.40,-1.40,0.13,1.47,1.17,0.28,0.49,0.60);
		wing_post(-3.14,-1.38,kind); wing_post(3.14,-1.38,kind); wing_post(-3.14,-0.19,kind); wing_post(3.14,-0.19,kind);
		box(-0.55,-0.36,-2.53,1.10,0.19,5.67,0.42,0.29,0.25);
		box(-1.40,-0.34,2.34,2.80,0.14,1.64,0.76,0.82,0.79);
		paris_steering_surfaces();
		box(-1.43,-0.24,2.46,0.15,1.30,1.40,0.38,0.52,0.34);
		box(1.28,-0.24,2.46,0.15,1.30,1.40,0.38,0.52,0.34);
		box(-0.43,-0.16,0.28,0.86,0.68,0.64,0.61,0.40,0.30);
		diamond(0.0,0.46,0.61,0.24,0.40,0.39,0.28,0.19);
		box(-0.94,-0.94,-0.15,0.29,0.63,0.61,0.22,0.19,0.17);
		box(0.65,-0.94,-0.15,0.29,0.63,0.61,0.22,0.19,0.17);
	};
};

unit(u64) model_attitude = fn(lane) {
	model_x = presented_pose[lane].x;
	model_y = presented_pose[lane].y;
	model_z = presented_pose[lane].z;
	model_hs = sin_small(presented_pose[lane].heading);
	model_hc = cos_small(presented_pose[lane].heading);
	model_ps = sin_small(presented_pose[lane].pitch);
	model_pc = cos_small(presented_pose[lane].pitch);
	model_rs = sin_small(-presented_pose[lane].roll);
	model_rc = cos_small(presented_pose[lane].roll);
};

unit(u64,bool) draw_plane = fn(lane,ghost) {
	model_attitude(lane);
	model_local = true;
	model_ghost = ghost;
	plane_model(course);
	model_local = false;
	model_ghost = false;
};

bool(i32, i32) held = fn(mask,bit) { (mask & bit) != 0 };
f32(i32,i32,i32) axis = fn(mask,a,b) {
	(if (held(mask,a)) { 1.0 } else { 0.0 }) - (if (held(mask,b)) { 1.0 } else { 0.0 })
};

i32() input_version = fn { 1 };

unit() cancel_drop = fn { pending_drop = false; };

i32(i32) quantized_axis = fn(raw) {
	i32 v = if (raw >= 128) { raw-256 } else { raw };
	i32 mag = if (v >= 0) { v } else { -v };
	i32 clipped = if (mag > 127) { 127 } else { mag };
	i32 q = (clipped*7+63)/127;
	if (v >= 0) { q } else { -q }
};

i32(i32,i32,i32,i32) effective_axis = fn(mask,raw,plus,minus) {
	if (held(mask,plus|minus)) {
		i32 a = if (held(mask,plus)) { 7 } else { 0 };
		i32 b = if (held(mask,minus)) { 7 } else { 0 };
		a-b
	} else { quantized_axis(raw) }
};

i32(i32) canonical_input = fn(mask) {
	if ((mask & 64) == 0) { mask & 191 } else {
		i32 bank = effective_axis(mask,(mask >> 8) & 255,2,1);
		i32 pitch = effective_axis(mask,(mask >> 16) & 255,4,8);
		64 | (mask & 176) | ((bank+7) << 8) | ((pitch+7) << 12)
	}
};

unit(u64) spawn = fn(lane) {
	poses[lane].x = home_x();
	poses[lane].y = 1.0;
	poses[lane].z = home_z()+3.0;
	poses[lane].heading = 0.0;
	poses[lane].pitch = 0.0;
	poses[lane].roll = 0.0;
	poses[lane].speed = 0.0;
	poses[lane].climb = 0.0;
};

f32(i32) bank_control = fn(controls) {
	if (held(controls,64)) { float_i(((controls >> 8) & 15)-7)/7.0 } else { axis(controls,2,1) }
};

unit(u64,i32) fly = fn(lane,controls) {
	f32 banks = bank_control(controls);
	f32 climbs = if (held(controls,64)) { float_i(((controls >> 12) & 15)-7)/7.0 } else { axis(controls,4,8) };
	f32 power = axis(controls,16,32);
	if (lane == 0) { cockpit_drive = power; };
	f32 roll_old = poses[lane].roll;
	f32 pitch_old = poses[lane].pitch;
	f32 speed_old = poses[lane].speed;
	f32 pitch = blend(pitch_old,climbs*0.34,0.12);
	f32 roll = blend(roll_old,banks*0.90,0.16);
	f32 target_speed = 24.0 + power*9.0 - pitch*19.0 - abs_f(roll)*3.0;
	f32 speed = clamp(blend(speed_old,target_speed,0.037),11.5,45.0);
	f32 turn = roll * (0.0275 + (24.0-speed)*0.00028);
	f32 heading = wrap(poses[lane].heading + turn);
	f32 glide = if (speed < 15.5) { (15.5-speed)*0.82 } else { 0.0 };
	f32 lift = pitch*speed-glide-abs_f(roll)*1.1;
	f32 climb = blend(poses[lane].climb,lift,0.16);
	f32 travel = speed / 30.0;
	poses[lane].x = poses[lane].x + travel*sin_small(heading);
	poses[lane].y = poses[lane].y + climb/30.0;
	poses[lane].z = poses[lane].z + travel*cos_small(heading);
	poses[lane].heading = heading;
	poses[lane].pitch = pitch;
	poses[lane].roll = roll;
	poses[lane].speed = speed;
	poses[lane].climb = climb;
};

bool(f32,f32,f32,f32,f32,f32,f32,f32) within = fn(x,y,z,x0,z0,w,l,h) {
	x >= x0 && x <= x0+w && z >= z0 && z <= z0+l && y < h
};

bool(f32,f32,f32,f32,f32,f32,f32,f32,f32) tower_leg_hit = fn(x,z,y,y0,y1,d0,d1,w0,w1) {
	if (y >= y0 && y <= y1) {
		f32 t = (y-y0)/(y1-y0);
		f32 d = blend(d0,d1,t);
		f32 w = blend(w0,w1,t) + 0.10;
		abs_f(x-d) <= w && abs_f(z-d) <= w
	} else { false }
};

bool(f32,f32,f32) tower_arch_hit = fn(u,d,y) {
	if (u >= 17.6 || y < 4.3 || y > 21.15) { false } else {
		f32 t = u/17.6;
		f32 h = 4.4 + 14.6*(1.0-t*t);
		y >= h-0.13 && y <= h+2.17 && abs_f(d-(20.0-y*0.29)) <= 0.32
	}
};

bool(f32,f32,f32,f32,f32,f32,f32,f32) tower_lattice_hit = fn(u,v,y,lo,hi,e0,e1,w) {
	if (y < lo || y > hi) { false } else {
		f32 t = (y-lo)/(hi-lo);
		f32 span = blend(e0,e1,t);
		f32 cross = abs_f(blend(-e0,e1,t));
		(abs_f(v-span) <= 0.24 && abs_f(u-cross) <= w+0.10) ||
		(abs_f(u-span) <= 0.24 && abs_f(v-cross) <= w+0.10)
	}
};

bool(f32,f32,f32) tower_hit = fn(px,y,pz) {
	f32 x = abs_f(px-tower_x());
	f32 z = abs_f(pz-tower_z());
	if (x > 22.1 || z > 22.1 || y >= 84.0) { false } else {
		(y <= 2.35 && abs_f(x-18.0) <= 4.0 && abs_f(z-18.0) <= 4.0) ||
		tower_leg_hit(x,z,y,2.35,11.0,18.0,15.6,2.9,2.43) ||
		tower_leg_hit(x,z,y,11.0,23.4,15.6,12.5,2.43,1.87) ||
		tower_arch_hit(x,z,y) || tower_arch_hit(z,x,y) ||
		(y >= 23.35 && y <= 26.12 && x <= 15.38 && z <= 15.38) ||
		tower_leg_hit(x,z,y,25.2,43.0,11.9,6.3,1.66,1.18) ||
		tower_lattice_hit(x,z,y,25.4,42.3,11.8,6.5,0.42) ||
		(y >= 42.45 && y <= 45.69 && x <= 8.35 && z <= 8.35) ||
		tower_leg_hit(x,z,y,44.8,57.0,5.95,3.2,1.03,0.66) ||
		tower_lattice_hit(x,z,y,45.1,52.0,5.9,4.35,0.29) ||
		tower_lattice_hit(x,z,y,52.0,57.0,4.35,3.2,0.24) ||
		tower_leg_hit(x,z,y,57.0,70.5,3.2,1.77,0.66,0.43) ||
		tower_lattice_hit(x,z,y,57.0,63.8,3.2,2.42,0.19) ||
		tower_lattice_hit(x,z,y,63.8,70.0,2.42,1.80,0.15) ||
		(y >= 69.65 && y <= 72.06 && x <= 3.28 && z <= 3.28) ||
		(y > 72.06 && y <= 78.18 && x <= 2.38 && z <= 2.38) ||
		(y > 78.18 && x <= 0.44 && z <= 0.44)
	}
};

bool(f32,f32,f32) obstacle = fn(x,y,z) {
	bool supply = within(x,y,z,service_x()-0.4,service_z()-0.4,service_w()+0.8,service_l()+0.8,service_h());
	if (supply) { true } else { if (course == 0) {
		within(x,y,z,129.0,84.0,32.0,26.0,17.0) || within(x,y,z,-77.0,151.0,32.0,26.0,17.0) ||
		within(x,y,z,163.0,111.0,7.0,7.0,17.0)
	} else {
		i32 col = core.float_to_sint_trunc<i32>((x+344.0)/56.0);
		i32 row = core.float_to_sint_trunc<i32>((z+205.0)/59.0);
		f32 bx = float_i(col)*56.0-344.0;
		f32 bz = float_i(row)*59.0-205.0;
		i32 lot = row*12+col;
		bool buildings = col>=0 && col<12 && row>=0 && row<8 && city_lot(bx,bz) && within(x,y,z,bx-1.0,bz-1.0,30.0,29.0,float_i(8+lot*11%18)+roof_rise(lot)+(if (lot%6 == 1) { 0.91 } else { 0.02 }));
		buildings || paris.station_hit(x,y,z) || within(x,y,z,-216.0,48.0,8.0,27.0,5.8) || within(x,y,z,281.0,288.0,8.0,27.0,5.8) || tower_hit(x,y,z) || within(x,y,z,54.0,172.0,10.0,119.0,9.35) || within(x,y,z,158.0,221.0,12.0,119.0,4.3)
	} }
};

f32(f32,f32,i32) gravity_root = fn(d,t,n) {
	if (n > 0) { gravity_root(d,(t+d/t)*0.5,n-1) } else { t }
};

f32(f32) mail_time = fn(y) { gravity_root((y-0.85)/9.0,1.0,4) };

i32(u64) mail_eligibility = fn(plane) {
	f32 y = poses[plane].y;
	f32 bearing = wrap(poses[plane].heading-0.80);
	if (y > 14.0) { 5 } else {
		if (y < 3.0) { 6 } else {
			if (abs_f(bearing) > 0.53 || abs_f(poses[plane].roll) > 0.32) { 7 } else { 0 }
		}
	}
};

f32(u64) mail_lead = fn(plane) { poses[plane].speed * mail_time(poses[plane].y) };
f32(u64,f32) predicted_mail_x = fn(plane,lead) { poses[plane].x + sin_small(poses[plane].heading)*lead };
f32(u64,f32) predicted_mail_z = fn(plane,lead) { poses[plane].z + cos_small(poses[plane].heading)*lead };

i32(f32,f32) mail_impact_status = fn(impact_x,impact_z) {
	f32 dx = impact_x-drop_x();
	f32 dz = impact_z-drop_z();
	if (dx*dx+dz*dz <= 90.25) { 9 } else { 8 }
};

i32(u64) drop_status = fn(plane) {
	i32 eligibility = mail_eligibility(plane);
	if (eligibility != 0) { eligibility } else {
		f32 lead = mail_lead(plane);
		mail_impact_status(predicted_mail_x(plane,lead),predicted_mail_z(plane,lead))
	}
};

unit(u64,u64) launch_mail = fn(plane,race) {
	f32 heading = poses[plane].heading;
	f32 speed = poses[plane].speed;
	mail[race][0] = poses[plane].x;
	mail[race][1] = poses[plane].y-0.65;
	mail[race][2] = poses[plane].z;
	mail[race][3] = speed * sin_small(heading);
	mail[race][4] = speed * cos_small(heading);
	mail[race][5] = 0.0;
	mail[race][6] = mail_time(poses[plane].y);
	phase[race] = MissionPhase::mail_in_flight;
};

unit(u64) lower_mail = fn(race) {
	f32 elapsed = mail[race][5];
	f32 total = mail[race][6];
	f32 next = clamp(elapsed+0.033333333,0.0,total);
	mail[race][0] = mail[race][0] + mail[race][3] * (next-elapsed);
	mail[race][2] = mail[race][2] + mail[race][4] * (next-elapsed);
	mail[race][1] = mail[race][1] - 9.0*(next*next-elapsed*elapsed);
	mail[race][5] = next;
	if (next >= total) {
		f32 dx = mail[race][0]-drop_x();
		f32 dz = mail[race][2]-drop_z();
		if (dx*dx+dz*dz <= 91.0) { phase[race] = MissionPhase::landing_approach; } else {
			phase[race] = MissionPhase::mail_approach;
			event_code[race] = 8;
		};
	};
};

bool(f32,f32) in_strip = fn(x,z) {
	abs_f(x-strip_x()) < strip_w()/2.0 && z >= strip_z() && z < strip_z()+strip_l()
};

i32(u64,bool) landing_issue = fn(plane,survivable) {
	f32 speed_limit = (if (course == 0) { 24.0 } else { 27.0 }) + (if (survivable) { 5.0 } else { 0.0 });
	f32 roll_limit = if (survivable) { 0.44 } else { 0.28 };
	f32 alignment_limit = if (survivable) { 0.84 } else { 0.90 };
	f32 sink_limit = if (survivable) { -7.0 } else { -4.3 };
	f32 pitch_limit = if (survivable) { 0.34 } else { 0.25 };
	if (abs_f(poses[plane].roll) >= roll_limit || cos_small(poses[plane].heading) <= alignment_limit) { 1 } else {
		if (poses[plane].speed >= speed_limit) { 2 } else {
			if (poses[plane].climb < sink_limit || abs_f(poses[plane].pitch) > pitch_limit) { 3 } else { 0 }
		}
	}
};

unit(u64,u64,i32,bool) roll_out = fn(plane,race,input,pickup) {
	f32 speed = poses[plane].speed;
	if (plane == 0) { cockpit_drive = if (held(input,32)) { -1.0 } else { if (held(input,16)) { 1.0 } else { 0.0 } }; };
	f32 brake = if (held(input,32)) { 7.3 } else { if (held(input,16)) { 0.65 } else { 2.6 } };
	f32 heading = wrap(poses[plane].heading + bank_control(input)*clamp(speed,0.0,17.0)*0.00052);
	f32 x = poses[plane].x + speed*sin_small(heading)/30.0;
	f32 z = poses[plane].z + speed*cos_small(heading)/30.0;
	poses[plane].x = x;
	poses[plane].z = z;
	poses[plane].heading = heading;
	poses[plane].speed = clamp(speed-brake/30.0,0.0,45.0);
	f32 z0 = if (pickup) { pickup_z() } else { strip_z() };
	f32 length = if (pickup) { pickup_l()-34.0 } else { strip_l() };
	f32 w = if (pickup) { pickup_w() } else { strip_w() };
	f32 cx = if (pickup) { pickup_x() } else { strip_x() };
	if (z < z0 || z >= z0+length) { result[race] = 9; } else {
		if (abs_f(x-cx) >= w/2.0) { result[race] = 11; } else {
			if (poses[plane].speed < 0.25) {
				poses[plane].speed = 0.0;
				if (pickup) { phase[race] = MissionPhase::cargo_pickup; } else { result[race] = 1; };
			};
		};
	};
};

unit(u64,u64,i32,bool) take_off = fn(plane,race,input,loaded) {
	f32 speed = poses[plane].speed;
	if (plane == 0) { cockpit_drive = if (held(input,32)) { -1.0 } else { if (held(input,16)) { 1.0 } else { 0.0 } }; };
	f32 force = if (held(input,32)) { -8.0 } else { if (held(input,16)) { 9.2 } else { -2.8 } };
	f32 next = clamp(speed+force/30.0,0.0,29.0);
	f32 bearing = wrap(poses[plane].heading+bank_control(input)*clamp(speed,0.0,17.0)*0.00075);
	poses[plane].heading = bearing;
	poses[plane].x = poses[plane].x+next*sin_small(bearing)/30.0;
	poses[plane].z = poses[plane].z+next*cos_small(bearing)/30.0;
	poses[plane].speed = next;
	f32 end = if (loaded) { pickup_z()+pickup_l() } else { home_z()+home_l() };
	f32 begin = if (loaded) { pickup_z() } else { home_z() };
	f32 pitch = if (held(input,64)) { float_i(((input>>12)&15)-7)/7.0 } else { axis(input,4,8) };
	if (poses[plane].z >= end || poses[plane].z < begin) { result[race] = 9; } else {
		f32 cx = if (loaded) { pickup_x() } else { home_x() };
		f32 width = if (loaded) { pickup_w() } else { home_w() };
		if (abs_f(poses[plane].x-cx) >= width*0.5) { result[race] = 11; } else {
			if (next > 17.0 && pitch > 0.12) {
				poses[plane].y = 1.16;
				poses[plane].pitch = 0.12;
				poses[plane].climb = 2.6;
				phase[race] = if (loaded) { if (course == 0) { MissionPhase::crop_spray } else { MissionPhase::seine_crossing } } else { MissionPhase::supply_approach };
			};
		};
	};
};

i32(u64,u64) spray_status = fn(plane,race) {
	f32 y = poses[plane].y;
	f32 z = poses[plane].z;
	f32 dx = poses[plane].x-pickup_x();
	f32 start = crop_z(spray_count[race]);
	if (y > 12.5) { 5 } else {
		if (y < 3.0) { 6 } else {
			if (abs_f(dx) > 13.0 || abs_f(poses[plane].roll) > 0.36) { 7 } else {
				if (z >= start && z < start+27.0) { 9 } else { 8 }
			}
		}
	}
};

unit(u64,u64,f32,f32,f32) score_gate = fn(plane,race,x0,y0,z0) {
	i32 n = next_gate[race];
	if (n < 3) {
		f32 z = poses[plane].z;
		f32 target = gate_z(n);
		if (z0 < target && z >= target) {
			f32 fraction = (target-z0)/(z-z0);
			f32 x = blend(x0,poses[plane].x,fraction);
			f32 dy = (blend(y0,poses[plane].y,fraction)-gate_y(n))/5.0;
			f32 dx = (x-gate_x(n))/9.1;
			if (dx*dx+dy*dy <= 1.0) {
				ring_score[race] = ring_score[race]+1;
				next_gate[race] = n+1;
				if (race == 0) {
					earned_gates = earned_gates | (1 << n);
					gate_flash = n;
					gate_flash_until = stage_tick[0]+43;
				};
			};
		};
	};
};

u16(i32) logged_control = fn(n) { flight_log[ix(n/4096)][ix(n/256%16)][ix(n/16%16)][ix(n%16)] };
u8(i32) record_byte = fn(n) { best_log[ix(n/4096)][ix(n/256%16)][ix(n/16%16)][ix(n%16)] };
u8(i32) packet_byte = fn(n) { incoming_log[ix(n/4096)][ix(n/256%16)][ix(n/16%16)][ix(n%16)] };

unit(i32,u8) set_best_byte = fn(i,value) {
	best_log[ix(i/4096)][ix(i/256%16)][ix(i/16%16)][ix(i%16)] = value;
};

unit(i32,i32) copy_packet = fn(i,last) {
	if (i < last) {
		set_best_byte(i,packet_byte(i));
		copy_packet(i+1,last);
	};
};

unit(i32,i32) write_record = fn(i,last) {
	if (i < last) {
		i32 value = core.int_extend<i32>(logged_control(i));
		i32 at = 6+i*2;
		set_best_byte(at,core.int_trunc<u8>(value & 255));
		set_best_byte(at+1,core.int_trunc<u8>(value >> 8));
		write_record(i+1,last);
	};
};

i32(i32) record_word = fn(step_index) {
	i32 i = 6+step_index*2;
	core.int_extend<i32>(record_byte(i)) + (core.int_extend<i32>(record_byte(i+1)) << 8)
};

i32(i32) packet_word = fn(step_index) {
	i32 i = 6+step_index*2;
	core.int_extend<i32>(packet_byte(i)) + (core.int_extend<i32>(packet_byte(i+1)) << 8)
};

bool(i32) valid_control = fn(word) {
	(word <= 191 && !held(word,64)) || (held(word,64) && (word & 15) == 0 &&
		((word >> 8) & 15) < 15 && ((word >> 12) & 15) < 15)
};

unit() store_record = fn {
	i32 record_ticks = stage_tick[0];
	if (best_ticks == 0 || record_ticks < best_ticks) {
		best_ticks = record_ticks;
		set_best_byte(0,87);
		set_best_byte(1,70);
		set_best_byte(2,7);
		set_best_byte(3,core.int_trunc<u8>(course));
		set_best_byte(4,core.int_trunc<u8>(record_ticks % 256));
		set_best_byte(5,core.int_trunc<u8>(record_ticks / 256));
		write_record(0,record_ticks);
		i32 size = record_ticks*2+6;
		unsafe { host.record(core.pointer_cast<*?u8>(&?best_log[0][0][0][0]),size); };
	};
};

unit() ghost_begin = fn {
	incoming_count = 0;
	incoming_bad = false;
};

unit(i32) ghost_byte = fn(b) {
	i32 i = incoming_count;
	if (i < 16206 && b >= 0 && b <= 255) {
		incoming_log[ix(i/4096)][ix(i/256%16)][ix(i/16%16)][ix(i%16)] = core.int_trunc<u8>(b);
		incoming_count = i+1;
	} else {
		incoming_bad = true;
	};
};

unit(u64,u64,i32) step_course = fn(plane,race,input) {
	stage_tick[race] = stage_tick[race]+1;
	i32 gate = next_gate[race];
	if (gate < 3 && stage_tick[race] > gate_deadline(gate)) { next_gate[race] = gate+1; };
	MissionPhase current = phase[race];
	if (current == MissionPhase::takeoff || current == MissionPhase::cargo_takeoff) { take_off(plane,race,input,current==MissionPhase::cargo_takeoff); } else {
	if (current == MissionPhase::cargo_pickup) {
		if (held(input,128)) { phase[race] = MissionPhase::cargo_takeoff; event_code[race] = 0; };
	} else {
	if (current == MissionPhase::final_rollout || current == MissionPhase::supply_rollout) { roll_out(plane,race,input,current==MissionPhase::supply_rollout); } else {
		f32 x = poses[plane].x;
		f32 y0 = poses[plane].y;
		f32 z0 = poses[plane].z;
		fly(plane,input);
		f32 next_x = poses[plane].x;
		f32 y = poses[plane].y;
		f32 z = poses[plane].z;
		score_gate(plane,race,x,y0,z0);
		if (current == MissionPhase::supply_approach && held(input,128)) { event_code[race] = 12; };
		if (current == MissionPhase::crop_spray && held(input,128)) {
			i32 status = spray_status(plane,race);
			if (status == 9) {
				i32 count = spray_count[race]+1;
				spray_count[race] = count;
				if (race == 0) { spray_tick = stage_tick[race]; };
				event_code[race] = 0;
				if (count == 3) { phase[race] = MissionPhase::landing_approach; };
			} else { event_code[race] = status; };
		};
		if (course == 1) {
			if (phase[race] == MissionPhase::seine_crossing) {
				if (x < 27.0 && next_x >= 27.0 && abs_f(z-161.0) < 15.0 && y < 8.8) { route[race] = 1; };
				if (next_x > 66.0) {
					if (route[race] == 0 || z < 170.0 || z > 211.0) { route[race] = 2; };
					phase[race] = MissionPhase::mail_approach;
				};
			};
			if (phase[race] == MissionPhase::mail_approach && held(input,128)) {
				i32 status = drop_status(plane);
				if (status == 9) { launch_mail(plane,race); event_code[race] = 0; } else { event_code[race] = status; };
			};
			if (phase[race] == MissionPhase::mail_in_flight) { lower_mail(race); };
		};
		if (y <= 1.0) {
			poses[plane].y = 1.0;
			i32 issue = landing_issue(plane,true);
			bool pickup = current == MissionPhase::supply_approach;
			bool in_pickup = abs_f(next_x-pickup_x()) < pickup_w()*0.5 && z >= pickup_z() && z < pickup_z()+pickup_l()-34.0;
			if (!pickup && phase[race] != MissionPhase::landing_approach) { result[race] = 7; } else {
				if (!(if (pickup) { in_pickup } else { in_strip(next_x,z) })) { result[race] = 4; } else {
					if (issue != 0) { result[race] = if (issue == 3) { 10 } else { 4+issue }; } else {
						phase[race] = if (pickup) { MissionPhase::supply_rollout } else { MissionPhase::final_rollout };
						event_code[race] = if (landing_issue(plane,false) == 0) { 0 } else { 13 };
						poses[plane].pitch = 0.0;
						poses[plane].roll = 0.0;
						poses[plane].climb = 0.0;
					};
				}
			}
		} else {
			if (y > 123.0 || abs_f(next_x) > 448.0 || z < -309.0 || z > 555.0) { result[race] = 3; } else {
				if (obstacle(next_x,y,z)) { result[race] = if (course == 1 && within(next_x,y,z,54.0,172.0,10.0,119.0,9.35)) { 8 } else { 2 }; };
			};
		};
	};
	};
	};
	if (stage_tick[race] >= 8100 && result[race] == 0) { result[race] = 3; };
};

unit(u64) reset_mission = fn(lane) {
	stage_tick[lane] = 0;
	phase[lane] = MissionPhase::takeoff;
	spray_count[lane] = 0;
	next_gate[lane] = 0;
	ring_score[lane] = 0;
	result[lane] = 0;
	route[lane] = 0;
	event_code[lane] = 0;
};

bool(i32,i32) validate_steps = fn(i,length) {
	i32 control = packet_word(i);
	if (valid_control(control)) {
		step_course(2,2,control);
		if (i+1 == length) { result[2] == 1 } else {
			if (result[2] == 0) { validate_steps(i+1,length) } else { false }
		}
	} else { false }
};

bool(i32) validate_replay = fn(length) {
	spawn(2);
	reset_mission(2);
	validate_steps(0,length)
};

unit(u64) retain_pose = fn(lane) {
	previous_pose[lane].x = poses[lane].x;
	previous_pose[lane].y = poses[lane].y;
	previous_pose[lane].z = poses[lane].z;
	previous_pose[lane].heading = poses[lane].heading;
	previous_pose[lane].pitch = poses[lane].pitch;
	previous_pose[lane].roll = poses[lane].roll;
};

unit(u64,f32) present_pose = fn(lane,alpha) {
	if (alpha >= 1.0) {
		presented_pose[lane].x = poses[lane].x;
		presented_pose[lane].y = poses[lane].y;
		presented_pose[lane].z = poses[lane].z;
		presented_pose[lane].heading = poses[lane].heading;
		presented_pose[lane].pitch = poses[lane].pitch;
		presented_pose[lane].roll = poses[lane].roll;
	} else {
		presented_pose[lane].x = blend(previous_pose[lane].x,poses[lane].x,alpha);
		presented_pose[lane].y = blend(previous_pose[lane].y,poses[lane].y,alpha);
		presented_pose[lane].z = blend(previous_pose[lane].z,poses[lane].z,alpha);
		f32 prev_heading = previous_pose[lane].heading;
		presented_pose[lane].heading = wrap(prev_heading+wrap(poses[lane].heading-prev_heading)*alpha);
		presented_pose[lane].pitch = blend(previous_pose[lane].pitch,poses[lane].pitch,alpha);
		presented_pose[lane].roll = blend(previous_pose[lane].roll,poses[lane].roll,alpha);
	};
};

unit() ghost_end = fn {
	if (!incoming_bad && incoming_count >= 7 && packet_byte(0)==87 && packet_byte(1)==70 &&
	    packet_byte(3)==core.int_trunc<u8>(course)) {
		i32 version = core.int_extend<i32>(packet_byte(2));
		i32 length = core.int_extend<i32>(packet_byte(4)) + 256*core.int_extend<i32>(packet_byte(5));
		if (version == 7 && length >= 180 && length <= 8100 && length*2+6 == incoming_count &&
		    stage_tick[0] == 0 && (best_ticks == 0 || length < best_ticks) && validate_replay(length)) {
			best_ticks = length;
			copy_packet(0,incoming_count);
			spawn(1);
			reset_mission(1);
			retain_pose(1);
			present_pose(1,1.0);
		};
	};
};

unit(i32) step = fn(input) {
	i32 n = stage_tick[0];
	flight_log[ix(n/4096)][ix(n/256%16)][ix(n/16%16)][ix(n%16)] = core.int_trunc<u16>(input);
	if (n < best_ticks) {
		retain_pose(1);
		step_course(1,1,record_word(n));
	};
	retain_pose(0);
	cockpit_drive = 0.0;
	step_course(0,0,input);
	if (result[0] == 1) { store_record(); };
};

unit(i32,i32) advance = fn(input,left) {
	if (left > 0 && accumulator >= 0.033333333 && result[0] == 0) {
		accumulator = accumulator - 0.033333333;
		i32 content = input | (if (pending_drop) { 128 } else { 0 });
		cancel_drop();
		step(content);
		advance(input,left-1);
	};
};

unit(i32) paint_crops = fn(n) {
	if (n < spray_count[0]) {
		f32 z = crop_z(n);
		ground_patch(-30.0,z+3.2,30.0,21.5,0.166,0.39+float_i(n)*0.018,0.72,0.43);
		paint_crops(n+1);
	};
};

unit(i32,i32) spray_mist = fn(n,age) {
	if (n < 7) {
		f32 t = float_i(n);
		f32 x = presented_pose[0].x - 4.2 + t*1.4;
		f32 z = presented_pose[0].z-2.5-t*0.9;
		f32 y = presented_pose[0].y - clamp(float_i(age)*0.105+t*0.11,0.0,5.0);
		if (y > 0.30) { diamond(x,y,z,0.35+t*0.047,0.59,0.77,0.91,0.73); };
		spray_mist(n+1,age);
	};
};

f32(MissionPhase,f32,f32) objective_x = fn(stage,x,z) {
	if (stage == MissionPhase::seine_crossing) { if (z < 100.0) { pickup_x() } else { if (x < 27.0) { 38.0 } else { 67.0 } } } else {
		if (stage == MissionPhase::mail_approach) { drop_x() } else { if (stage == MissionPhase::landing_approach || stage == MissionPhase::final_rollout || stage == MissionPhase::mail_in_flight) { strip_x() } else { if (stage == MissionPhase::takeoff) { home_x() } else { pickup_x() } } }
	}
};

f32(MissionPhase,f32,f32) objective_z = fn(stage,x,z) {
	if (stage == MissionPhase::seine_crossing) { if (z < 100.0) { 120.0 } else { if (x < 27.0) { 169.0 } else { 189.0 } } } else {
		if (stage == MissionPhase::mail_approach) { drop_z() } else {
			if (stage == MissionPhase::crop_spray) { crop_z(spray_count[0])+10.0 } else {
				if (stage == MissionPhase::takeoff) { home_z()+home_l()-3.0 } else {
					if (stage == MissionPhase::supply_approach) { pickup_z()+12.0 } else {
						if (stage == MissionPhase::cargo_takeoff) { pickup_z()+pickup_l()-3.0 } else { if (stage == MissionPhase::supply_rollout || stage == MissionPhase::cargo_pickup) { pickup_z()+pickup_l()-38.0 } else { strip_z()+15.0 } }
					}
				}
			}
		}
	}
};

unit(f32,f32,f32,f32,f32,f32,f32) arrow_wing = fn(x,y,z,tx,tz,rx,rz) {
	f32 tip_x = x+tx*3.1;
	f32 tip_z = z+tz*3.1;
	f32 wing_x = x+rx*2.8-tx*2.1;
	f32 wing_z = z+rz*2.8-tz*2.1;
	f32 notch_x = x+tx*0.3;
	f32 notch_z = z+tz*0.3;
	f32 inner_tip_x = x+tx*2.54;
	f32 inner_tip_z = z+tz*2.54;
	f32 inner_wing_x = x+rx*2.17-tx*1.73;
	f32 inner_wing_z = z+rz*2.17-tz*1.73;
	f32 inner_notch_x = x+tx*0.75;
	f32 inner_notch_z = z+tz*0.75;
	quad(tip_x,y+0.70,tip_z,wing_x,y,wing_z,inner_wing_x,y+0.12,inner_wing_z,inner_tip_x,y+0.61,inner_tip_z,0.035,0.095,0.10);
	quad(wing_x,y,wing_z,notch_x,y+0.35,notch_z,inner_notch_x,y+0.38,inner_notch_z,inner_wing_x,y+0.12,inner_wing_z,0.035,0.095,0.10);
	tri(inner_tip_x,y+0.61,inner_tip_z,inner_wing_x,y+0.12,inner_wing_z,inner_notch_x,y+0.38,inner_notch_z,0.28,1.0,0.89);
};

unit(f32,f32,f32,f32,f32) direction_arrow = fn(x,y,z,dx,dz) {
	f32 extent = clamp(abs_f(dx)+abs_f(dz),0.01,1500.0);
	f32 tx = dx/extent;
	f32 tz = dz/extent;
	arrow_wing(x,y,z,tx,tz,tz,-tx);
	arrow_wing(x,y,z,tx,tz,-tz,tx);
};

unit() supply_beacon = fn {
	f32 x = pickup_x();
	f32 z = pickup_z()+34.0;
	diamond(x,7.0,z,2.5,-3.0,0.28,1.0,0.89);
	ground_patch(x-5.0,z-6.0,10.0,0.62,0.39,0.14,0.72,0.67);
	ground_patch(x-5.0,z+5.38,10.0,0.62,0.39,0.14,0.72,0.67);
	ground_patch(x-5.0,z-5.38,0.62,10.76,0.39,0.14,0.72,0.67);
	ground_patch(x+4.38,z-5.38,0.62,10.76,0.39,0.14,0.72,0.67);
};

unit(f32,f32,f32,f32,f32,f32,f32,f32) load_ink = fn(x,z,rx,rz,left,bottom,width,height) {
	f32 ax = x+rx*left;
	f32 az = z+rz*left;
	f32 bx = ax+rx*width;
	f32 bz = az+rz*width;
	quad(ax,bottom,az,bx,bottom,bz,bx,bottom+height,bz,ax,bottom+height,az,0.42,0.97,0.84);
};

unit(f32,f32,f32,f32,f32) load_waypoint = fn(x,y,z,hx,hz) {
	f32 rx = hz;
	f32 rz = -hx;
	f32 b = if (cockpit_view) { y+0.94 } else { y+3.0 };
	f32 t = b+1.75;
	f32 l = -2.65;
	f32 r = 2.65;
	quad(x+rx*l,b,z+rz*l,x+rx*r,b,z+rz*r,x+rx*r,t,z+rz*r,x+rx*l,t,z+rz*l,0.045,0.17,0.16);
	if (!cockpit_view) { tri(x-rx*0.42,b,z-rz*0.42,x+rx*0.42,b,z+rz*0.42,x,y+2.18,z,0.42,0.97,0.84); };
	f32 load_ink_origin_x = x-hx*0.028;
	f32 load_ink_origin_z = z-hz*0.028;
	f32 load_ink_origin_y = b+0.37;
	load_ink(load_ink_origin_x,load_ink_origin_z,rx,rz,-2.2,load_ink_origin_y,0.16,1.0);
	load_ink(load_ink_origin_x,load_ink_origin_z,rx,rz,-2.04,load_ink_origin_y,0.74,0.16);
	load_ink(load_ink_origin_x,load_ink_origin_z,rx,rz,-1.05,load_ink_origin_y,0.16,1.0);
	load_ink(load_ink_origin_x,load_ink_origin_z,rx,rz,-0.89,load_ink_origin_y,0.58,0.16);
	load_ink(load_ink_origin_x,load_ink_origin_z,rx,rz,-0.89,load_ink_origin_y+0.84,0.58,0.16);
	load_ink(load_ink_origin_x,load_ink_origin_z,rx,rz,-0.31,load_ink_origin_y,0.16,1.0);
	load_ink(load_ink_origin_x,load_ink_origin_z,rx,rz,0.10,load_ink_origin_y,0.16,1.0);
	load_ink(load_ink_origin_x,load_ink_origin_z,rx,rz,0.26,load_ink_origin_y+0.46,0.58,0.16);
	load_ink(load_ink_origin_x,load_ink_origin_z,rx,rz,0.26,load_ink_origin_y+0.84,0.58,0.16);
	load_ink(load_ink_origin_x,load_ink_origin_z,rx,rz,0.84,load_ink_origin_y,0.16,1.0);
	load_ink(load_ink_origin_x,load_ink_origin_z,rx,rz,1.25,load_ink_origin_y,0.16,1.0);
	load_ink(load_ink_origin_x,load_ink_origin_z,rx,rz,1.41,load_ink_origin_y,0.58,0.16);
	load_ink(load_ink_origin_x,load_ink_origin_z,rx,rz,1.41,load_ink_origin_y+0.84,0.58,0.16);
	load_ink(load_ink_origin_x,load_ink_origin_z,rx,rz,1.99,load_ink_origin_y+0.12,0.16,0.76);
};

unit(f32,f32,f32,f32,f32,f32,f32,f32) drop_ink = fn(x,z,rx,rz,left,bottom,width,height) {
	f32 ax = x+rx*left;
	f32 az = z+rz*left;
	f32 bx = ax+rx*width;
	f32 bz = az+rz*width;
	quad(ax,bottom,az,bx,bottom,bz,bx,bottom+height,bz,ax,bottom+height,az,0.99,0.72,0.29);
};

unit(f32,f32) drop_waypoint = fn(hx,hz) {
	f32 x = drop_x();
	f32 z = drop_z();
	f32 rx = hz;
	f32 rz = -hx;
	f32 l = -5.4;
	f32 r = 5.4;
	quad(x+rx*l,5.9,z+rz*l,x+rx*r,5.9,z+rz*r,x+rx*r,9.1,z+rz*r,x+rx*l,9.1,z+rz*l,0.19,0.13,0.10);
	tri(x-rx*0.85,5.9,z-rz*0.85,x+rx*0.85,5.9,z+rz*0.85,x,4.7,z,0.99,0.72,0.29);
	f32 ix0 = x-hx*0.035;
	f32 iz0 = z-hz*0.035;
	drop_ink(ix0,iz0,rx,rz,-4.5,6.5,0.28,2.0);
	drop_ink(ix0,iz0,rx,rz,-4.22,6.5,1.08,0.28);
	drop_ink(ix0,iz0,rx,rz,-4.22,8.22,1.08,0.28);
	drop_ink(ix0,iz0,rx,rz,-3.14,6.78,0.28,1.44);
	drop_ink(ix0,iz0,rx,rz,-2.2,6.5,0.28,2.0);
	drop_ink(ix0,iz0,rx,rz,-1.92,8.22,1.08,0.28);
	drop_ink(ix0,iz0,rx,rz,-0.84,7.6,0.28,0.62);
	drop_ink(ix0,iz0,rx,rz,-1.92,7.32,1.08,0.28);
	tri(ix0-rx*1.64,7.32,iz0-rz*1.64,ix0-rx*1.30,7.32,iz0-rz*1.30,ix0-rx*0.62,6.50,iz0-rz*0.62,0.99,0.72,0.29);
	tri(ix0-rx*1.64,7.32,iz0-rz*1.64,ix0-rx*0.62,6.50,iz0-rz*0.62,ix0-rx*0.97,6.50,iz0-rz*0.97,0.99,0.72,0.29);
	drop_ink(ix0,iz0,rx,rz,0.10,6.5,0.28,2.0);
	drop_ink(ix0,iz0,rx,rz,0.38,6.5,1.08,0.28);
	drop_ink(ix0,iz0,rx,rz,0.38,8.22,1.08,0.28);
	drop_ink(ix0,iz0,rx,rz,1.46,6.78,0.28,1.44);
	drop_ink(ix0,iz0,rx,rz,2.40,6.5,0.28,2.0);
	drop_ink(ix0,iz0,rx,rz,2.68,8.22,1.08,0.28);
	drop_ink(ix0,iz0,rx,rz,3.76,7.6,0.28,0.62);
	drop_ink(ix0,iz0,rx,rz,2.68,7.32,1.08,0.28);
};

unit(f32,f32,f32,f32,f32,f32,f32) impact_ink = fn(px,pz,side_x,side_z,left,bottom,width) {
	f32 ax = px+side_x*left;
	f32 az = pz+side_z*left;
	f32 bx = ax+side_x*width;
	f32 bz = az+side_z*width;
	quad(ax,bottom,az,bx,bottom,bz,bx,bottom+0.26,bz,ax,bottom+0.26,az,0.44,0.84,1.0);
};

unit(f32,f32,f32,f32) impact_pipper = fn(px,pz,hx,hz) {
	impact_ink(px,pz,hz,-hx,-2.55,5.64,1.8);
	impact_ink(px,pz,hz,-hx,0.75,5.64,1.8);
	diamond(px,5.77,pz,0.60,-0.90,0.44,0.84,1.0);
};

bool() ring_celebrating = fn { gate_flash >= 0 && stage_tick[0] < gate_flash_until };

unit(i32,bool) passed_guides = fn(n,celebrating) {
	if (n < 3) {
		if ((earned_gates & (1 << n)) != 0 && (!celebrating || n != gate_flash)) {
			gate_arch(gate_x(n),gate_y(n),gate_z(n),0,2);
		};
		passed_guides(n+1,celebrating);
	};
};

unit(i32,f32,f32) flight_guides = fn(mail_status,impact_x,impact_z) {
	i32 next = next_gate[0];
	if (next < 3) { gate_arch(gate_x(next),gate_y(next),gate_z(next),0,0); };
	bool celebrating = ring_celebrating();
	if (celebrating) { gate_arch(gate_x(gate_flash),gate_y(gate_flash),gate_z(gate_flash),0,1); };
	if (earned_gates != 0) { passed_guides(0,celebrating); };
	if (result[0] == 0) {
		MissionPhase stage = phase[0];
		f32 x = presented_pose[0].x;
		f32 y = presented_pose[0].y;
		f32 z = presented_pose[0].z;
		f32 heading = presented_pose[0].heading;
		f32 hx = sin_small(heading);
		f32 hz = cos_small(heading);
		f32 tx = objective_x(stage,x,z);
		f32 tz = objective_z(stage,x,z);
		if (stage == MissionPhase::cargo_pickup) {
			f32 load_board_offset = if (cockpit_view) { 12.0 } else { 0.0 };
			load_waypoint(poses[0].x+hx*load_board_offset,poses[0].y,poses[0].z+hz*load_board_offset,hx,hz);
		} else {
			bool final_strip = stage == MissionPhase::landing_approach || stage == MissionPhase::final_rollout || stage == MissionPhase::mail_in_flight;
			f32 run_z = if (final_strip) { strip_z() } else { pickup_z() };
			f32 run_w = if (final_strip) { strip_w() } else { pickup_w() };
			f32 run_l = if (final_strip) { strip_l() } else { pickup_l() };
			bool on_runway_line = (final_strip || stage == MissionPhase::supply_approach || stage == MissionPhase::supply_rollout || stage == MissionPhase::cargo_takeoff)
				&& abs_f(tx-x) < run_w*0.45 && z >= run_z && z < run_z+run_l && hz > 0.75;
			f32 dx = tx-x;
			f32 dz = if (on_runway_line && tz-z < 18.0) { 18.0 } else { tz-z };
			if (abs_f(dx)+abs_f(dz) > 2.0) {
				direction_arrow(x+hx*10.0,y+3.9,z+hz*10.0,dx,dz);
			};
			if (stage == MissionPhase::mail_approach) {
				drop_waypoint(hx,hz);
				if (mail_status == 8 || mail_status == 9) { impact_pipper(impact_x,impact_z,hx,hz); };
			};
			if (stage == MissionPhase::supply_approach || stage == MissionPhase::supply_rollout) {
				supply_beacon();
			};
		};
	};
};

unit(f32,f32,f32,f32,f32,f32,i32,i32) cockpit_dial_segment = fn(cx,sx,sy,tx,ty,metal,dial_kind,spoke) {
	f32 cy = -0.81;
	f32 depth = 2.10;
	f32 radius = 0.132;
	f32 inner = radius*0.87;
	quad(cx+sx*radius,cy+sy*radius,depth,cx+tx*radius,cy+ty*radius,depth,
		cx+tx*inner,cy+ty*inner,depth,cx+sx*inner,cy+sy*inner,depth,metal,metal*0.72,metal*0.39);
	f32 face_red = if (dial_kind == 0) { 0.195 } else { if (dial_kind == 1) { 0.087 } else { 0.119 } };
	f32 face_green = if (dial_kind == 0) { 0.136 } else { if (dial_kind == 1) { 0.172 } else { 0.195 } };
	f32 face_blue = if (dial_kind == 0) { 0.083 } else { if (dial_kind == 1) { 0.209 } else { 0.126 } };
	tri(cx,cy,depth+0.009,cx+sx*inner,cy+sy*inner,depth+0.009,cx+tx*inner,cy+ty*inner,depth+0.009,face_red,face_green,face_blue);
	bool center = spoke == 0;
	bool marked = if (dial_kind == 2) { center || spoke == 1 || spoke == 11 || spoke == 2 || spoke == 10 } else { spoke < 5 || spoke >= 8 };
	if (marked) {
		f32 reach = if (dial_kind == 2 && center) { 0.57 } else { if (spoke % 2 == 0) { 0.71 } else { 0.80 } };
		f32 mark_r = if (dial_kind == 0) { 0.95 } else { if (dial_kind == 1) { 0.58 } else { 0.77 } };
		f32 mark_g = if (dial_kind == 0) { 0.68 } else { if (dial_kind == 1) { 0.85 } else { 0.93 } };
		f32 mark_b = if (dial_kind == 0) { 0.33 } else { if (dial_kind == 1) { 0.94 } else { 0.64 } };
		tri(cx+sx*inner*reach,cy+sy*inner*reach,depth-0.012,
			cx+sx*inner*0.95-sy*0.009,cy+sy*inner*0.95+sx*0.009,depth-0.012,
			cx+sx*inner*0.95+sy*0.009,cy+sy*inner*0.95-sx*0.009,depth-0.012,mark_r,mark_g,mark_b);
	};
};

unit(f32,i32,f32,f32) cockpit_dials = fn(metal,segment,sx,sy) {
	if (segment < 12) {
		f32 angle = wrap(float_i(segment+1)*0.5235988);
		f32 tx = sin_small(angle);
		f32 ty = cos_small(angle);
		cockpit_dial_segment(-0.39,sx,sy,tx,ty,metal,0,segment);
		cockpit_dial_segment(-0.10,sx,sy,tx,ty,metal,1,segment);
		cockpit_dial_segment(0.19,sx,sy,tx,ty,metal,2,segment);
		cockpit_dials(metal,segment+1,tx,ty);
	};
};

unit(f32,f32,f32,f32,f32,f32,f32) cockpit_pointer = fn(cx,cy,depth,angle,red,green,blue) {
	f32 ns = sin_small(angle);
	f32 nc = cos_small(angle);
	tri(cx-nc*0.014,cy+ns*0.014,depth,cx+ns*0.094,cy+nc*0.094,depth,cx+nc*0.014,cy-ns*0.014,depth,red,green,blue);
};

unit(f32,f32,f32,f32,f32) cockpit_letter_stroke = fn(left,from_x,from_y,to_x,to_y) {
	f32 ax = left+from_x*0.021;
	f32 ay = -0.656+from_y*0.024;
	f32 bx = left+to_x*0.021;
	f32 by = -0.656+to_y*0.024;
	f32 dx = to_x-from_x;
	f32 dy = to_y-from_y;
	f32 length = abs_f(dx)+abs_f(dy);
	f32 nx = -dy/length*0.009;
	f32 ny = dx/length*0.009;
	f32 letter_depth = 2.059;
	quad(ax-nx,ay-ny,letter_depth,bx-nx,by-ny,letter_depth,bx+nx,by+ny,letter_depth,ax+nx,ay+ny,letter_depth,0.99,0.91,0.71);
};

unit(f32) cockpit_letter_s = fn(left) {
	cockpit_letter_stroke(left,0.0,4.0,2.0,4.0);
	cockpit_letter_stroke(left,0.0,4.0,0.0,2.0);
	cockpit_letter_stroke(left,0.0,2.0,2.0,2.0);
	cockpit_letter_stroke(left,2.0,2.0,2.0,0.0);
	cockpit_letter_stroke(left,2.0,0.0,0.0,0.0);
};

unit(f32) cockpit_letter_p = fn(left) {
	cockpit_letter_stroke(left,0.0,0.0,0.0,4.0);
	cockpit_letter_stroke(left,0.0,4.0,2.0,4.0);
	cockpit_letter_stroke(left,2.0,4.0,2.0,2.0);
	cockpit_letter_stroke(left,2.0,2.0,0.0,2.0);
};

unit(f32) cockpit_letter_d = fn(left) {
	cockpit_letter_stroke(left,0.0,0.0,0.0,4.0);
	cockpit_letter_stroke(left,0.0,4.0,2.0,3.0);
	cockpit_letter_stroke(left,2.0,3.0,2.0,1.0);
	cockpit_letter_stroke(left,2.0,1.0,0.0,0.0);
};

unit(f32) cockpit_letter_a = fn(left) {
	cockpit_letter_stroke(left,0.0,0.0,0.0,3.0);
	cockpit_letter_stroke(left,0.0,3.0,1.0,4.0);
	cockpit_letter_stroke(left,1.0,4.0,2.0,3.0);
	cockpit_letter_stroke(left,2.0,3.0,2.0,0.0);
	cockpit_letter_stroke(left,0.0,2.0,2.0,2.0);
};

unit(f32) cockpit_letter_l = fn(left) {
	cockpit_letter_stroke(left,0.0,4.0,0.0,0.0);
	cockpit_letter_stroke(left,0.0,0.0,2.0,0.0);
};

unit(f32) cockpit_letter_t = fn(left) {
	cockpit_letter_stroke(left,0.0,4.0,2.0,4.0);
	cockpit_letter_stroke(left,1.0,4.0,1.0,0.0);
};

unit(f32) cockpit_letter_b = fn(left) {
	cockpit_letter_stroke(left,0.0,0.0,0.0,4.0);
	cockpit_letter_stroke(left,0.0,4.0,2.0,4.0);
	cockpit_letter_stroke(left,2.0,4.0,2.0,0.0);
	cockpit_letter_stroke(left,2.0,2.0,0.0,2.0);
	cockpit_letter_stroke(left,2.0,0.0,0.0,0.0);
};

unit(f32) cockpit_letter_n = fn(left) {
	cockpit_letter_stroke(left,0.0,0.0,0.0,4.0);
	cockpit_letter_stroke(left,0.0,4.0,2.0,0.0);
	cockpit_letter_stroke(left,2.0,0.0,2.0,4.0);
};

unit(f32) cockpit_letter_k = fn(left) {
	cockpit_letter_stroke(left,0.0,0.0,0.0,4.0);
	cockpit_letter_stroke(left,0.0,2.0,2.0,4.0);
	cockpit_letter_stroke(left,0.0,2.0,2.0,0.0);
};

unit() cockpit_plaques = fn {
	quad(-0.528,-0.674,2.064,0.329,-0.674,2.064,0.329,-0.534,2.064,-0.528,-0.534,2.064,0.128,0.107,0.073);
	cockpit_letter_s(-0.473);
	cockpit_letter_p(-0.411);
	cockpit_letter_d(-0.349);
	cockpit_letter_a(-0.183);
	cockpit_letter_l(-0.121);
	cockpit_letter_t(-0.059);
	cockpit_letter_b(0.076);
	cockpit_letter_a(0.138);
	cockpit_letter_n(0.200);
	cockpit_letter_k(0.262);
};

unit() cockpit_model = fn {
	model_attitude(0);
	model_x = model_x+model_hs*0.75;
	model_y = model_y+0.82;
	model_z = model_z+model_hc*0.75;
	model_local = true;
	if (course == 0) {
		box(-1.14,-1.14,2.20,2.28,0.22,0.32,0.48,0.29,0.16);
		box(-0.61,-1.02,2.17,1.22,0.48,0.15,0.55,0.34,0.19);
		box(-1.24,-1.30,1.09,0.12,0.33,2.10,0.67,0.43,0.23);
		box(1.12,-1.30,1.09,0.12,0.33,2.10,0.67,0.43,0.23);
		box(-1.08,-1.08,2.28,0.33,0.05,1.46,0.73,0.63,0.44);
		box(0.75,-1.08,2.28,0.33,0.05,1.46,0.73,0.63,0.44);
		box(-1.03,-1.13,2.12,2.06,0.04,0.10,0.76,0.53,0.30);
	} else {
		box(-0.84,-1.35,1.30,0.18,0.27,2.80,0.34,0.18,0.12);
		box(0.66,-1.35,1.30,0.18,0.27,2.80,0.34,0.18,0.12);
		box(-0.75,-1.15,2.16,1.50,0.27,0.42,0.27,0.14,0.10);
		box(-0.56,-1.00,2.15,1.12,0.47,0.22,0.39,0.22,0.14);
		box(-0.49,-1.16,2.60,0.98,0.61,1.23,0.64,0.60,0.42);
		box(-0.50,-1.10,2.53,1.00,0.055,0.10,0.72,0.46,0.21);
	};
	f32 metal = if (course == 0) { 0.62 } else { 0.84 };
	cockpit_dials(metal,0,0.0,1.0);
	cockpit_plaques();
	cockpit_pointer(-0.39,-0.81,2.074,poses[0].speed*(4.1887902/45.0)-2.0943951,0.98,0.52,0.28);
	cockpit_pointer(-0.10,-0.81,2.074,clamp(poses[0].y,0.0,125.0)*(4.1887902/125.0)-2.0943951,0.46,0.86,0.95);
	cockpit_pointer(0.19,-0.81,2.074,-poses[0].roll,0.59,0.96,0.54);
	box(0.397,-0.950,2.078,0.104,0.26,0.10,0.17,0.13,0.10);
	box(0.387,-0.846+cockpit_drive*0.071,2.013,0.124,0.060,0.097,0.94,0.62,0.27);
	model_local = false;
};

unit(f32) seine_market_craft = fn(alpha) {
	f32 seconds = (float_i(stage_tick[0])+alpha)/30.0;
	f32 travel = (seconds-16.0)*2.1;
	f32 hull_x = 82.0+clamp(travel,0.0,54.0);
	f32 hull_z = upstream_bank(hull_x)+39.0;
	if (abs_f(hull_x-presented_pose[0].x)<145.0 && abs_f(hull_z-presented_pose[0].z)<132.0) {
		quad(hull_x-6.0,0.52,hull_z-3.9,hull_x+3.2,0.52,hull_z+0.61,hull_x+3.2,0.52,hull_z+3.45,hull_x-6.0,0.52,hull_z-1.06,0.32,0.16,0.11);
		tri(hull_x+3.2,0.52,hull_z+0.61,hull_x+3.2,0.52,hull_z+3.45,hull_x+6.0,0.52,hull_z+3.40,0.32,0.16,0.11);
		quad(hull_x-6.0,0.085,hull_z-1.06,hull_x+3.2,0.085,hull_z+3.45,hull_x+3.2,0.52,hull_z+3.45,hull_x-6.0,0.52,hull_z-1.06,0.52,0.26,0.18);
		quad(hull_x+3.2,0.085,hull_z+3.45,hull_x+6.0,0.085,hull_z+3.40,hull_x+6.0,0.52,hull_z+3.40,hull_x+3.2,0.52,hull_z+3.45,0.57,0.30,0.19);
		quad(hull_x-6.0,0.085,hull_z-3.9,hull_x+3.2,0.085,hull_z+0.61,hull_x+3.2,0.52,hull_z+0.61,hull_x-6.0,0.52,hull_z-3.9,0.39,0.20,0.14);
		quad(hull_x+3.2,0.085,hull_z+0.61,hull_x+6.0,0.085,hull_z+3.40,hull_x+6.0,0.52,hull_z+3.40,hull_x+3.2,0.52,hull_z+0.61,0.43,0.22,0.16);
		box(hull_x-4.75,0.53,hull_z-2.44,2.45,0.31,0.98,0.73,0.60,0.39);
		quad(hull_x-0.7,0.84,hull_z-0.24,hull_x+2.4,0.84,hull_z+1.28,hull_x+2.4,0.84,hull_z+2.35,hull_x-0.7,0.84,hull_z+0.83,0.68,0.34,0.21);
		quad(hull_x-0.7,0.84,hull_z+0.83,hull_x+2.4,0.84,hull_z+2.35,hull_x+2.4,0.58,hull_z+2.43,hull_x-0.7,0.58,hull_z+0.91,0.86,0.68,0.38);
		if (travel > 0.0 && travel < 54.0) {
			f32 wake_length = clamp(travel*0.6,0.05,9.7);
			tri(hull_x-5.95,0.052,hull_z-3.64,hull_x-6.75,0.052,hull_z-3.65,hull_x-6.75-wake_length,0.052,hull_z-5.0-wake_length*0.72,0.62,0.77,0.72);
			tri(hull_x-5.95,0.052,hull_z-1.23,hull_x-6.75,0.052,hull_z-1.62,hull_x-6.75-wake_length,0.052,hull_z-0.18-wake_length*0.25,0.62,0.77,0.72);
		};
	};
};

unit(f32) wright_supply_cart = fn(alpha) {
	f32 x = service_x()+1.17;
	f32 z0 = service_z()+13.1;
	if (abs_f(x-presented_pose[0].x) < 100.0 && abs_f(z0-presented_pose[0].z) < 103.0) {
		f32 t = (float_i(stage_tick[0])+alpha)/30.0;
		f32 z = z0+3.4*(1.0-sin_small(wrap(t*0.57+1.5707963)));
		ground_patch(x-0.29,z-0.34,4.13,2.49,0.179,0.37,0.33,0.25);
		box(x,0.37,z,3.82,0.47,2.09,0.60,0.39,0.21);
		quad(x+0.42,0.842,z+0.24, x+3.38,0.842,z+0.24, x+3.38,0.842,z+1.86, x+0.42,0.842,z+1.86, 0.91,0.58,0.23);
		quad(x+0.34,0.18,z+2.104, x+0.94,0.18,z+2.104, x+0.94,0.68,z+2.104, x+0.34,0.68,z+2.104, 0.26,0.23,0.19);
		quad(x+2.86,0.18,z+2.104, x+3.46,0.18,z+2.104, x+3.46,0.68,z+2.104, x+2.86,0.68,z+2.104, 0.26,0.23,0.19);
	};
};

unit(f32,i32,f32,f32) draw_aircraft = fn(alpha,mail_status,impact_x,impact_z) {
	vertex_count = 0;
	drawing_world = false;
	flight_guides(mail_status,impact_x,impact_z);
	if (course == 0) {
		paint_crops(0);
		i32 age = stage_tick[0]-spray_tick;
		if (age < 36) { spray_mist(0,age); };
		if (phase[0] == MissionPhase::supply_approach || phase[0] == MissionPhase::supply_rollout || phase[0] == MissionPhase::cargo_pickup) { wright_supply_cart(alpha); };
	} else {
		if (phase[0] == MissionPhase::seine_crossing || phase[0] == MissionPhase::mail_approach) { seine_market_craft(alpha); };
	};
	if (phase[0] == MissionPhase::mail_in_flight) {
		box(mail[0][0]-0.30,mail[0][1],mail[0][2]-0.30,0.60,0.54,0.60,0.92,0.50,0.18);
	};

	if (best_ticks > 0 && stage_tick[0] > 0 && stage_tick[0] < best_ticks) {
		present_pose(1,alpha);
		f32 dx = presented_pose[1].x-presented_pose[0].x;
		f32 dy = presented_pose[1].y-presented_pose[0].y;
		f32 dz = presented_pose[1].z-presented_pose[0].z;
		if (dx*dx+dy*dy+dz*dz > 121.0) { draw_plane(1,true); };
	};
	if (cockpit_view) { cockpit_model(); } else { draw_plane(0,false); };
	i32 count = vertex_count*6;
	unsafe { host.aircraft(core.pointer_cast<*?u8>(&?moving_mesh[0][0][0][0]),count); };
};

f32(MissionPhase) phase_code = fn(stage) {
	if (stage == MissionPhase::seine_crossing) { 0.0 } else {
		if (stage == MissionPhase::mail_approach) { 1.0 } else {
			if (stage == MissionPhase::landing_approach) { 2.0 } else {
				if (stage == MissionPhase::final_rollout) { 3.0 } else {
					if (stage == MissionPhase::mail_in_flight) { 5.0 } else {
						if (stage == MissionPhase::takeoff) { 6.0 } else {
							if (stage == MissionPhase::supply_approach) { 7.0 } else {
								if (stage == MissionPhase::supply_rollout) { 8.0 } else {
									if (stage == MissionPhase::cargo_pickup) { 9.0 } else {
										if (stage == MissionPhase::cargo_takeoff) { 10.0 } else {
											11.0
										}
									}
								}
							}
						}
					}
				}
			}
		}
	}
};

unit(i32) select_view = fn(view) {
	cockpit_view = view == 1;
};

unit(i32) frame = fn(mail_status) {
	f32 hx = sin_small(presented_pose[0].heading);
	f32 hz = cos_small(presented_pose[0].heading);
	f32 pitch = if (cockpit_view) { presented_pose[0].pitch } else { -0.20 + presented_pose[0].pitch*0.62 };
	f32 ps = sin_small(pitch);
	f32 pc = cos_small(pitch);
	f32 vx = hx*pc;
	f32 vy = ps;
	f32 vz = hz*pc;
	f32 ux = -hx*ps;
	f32 uy = pc;
	f32 uz = -hz*ps;
	f32 ex = if (cockpit_view) { presented_pose[0].x+hx*0.75 } else { presented_pose[0].x-hx*17.5 };
	f32 ey = if (cockpit_view) { presented_pose[0].y+0.82 } else { presented_pose[0].y+5.3 };
	f32 ez = if (cockpit_view) { presented_pose[0].z+hz*0.75 } else { presented_pose[0].z-hz*17.5 };
	f32 roll = presented_pose[0].roll;
	f32 rs = if (cockpit_view) { sin_small(-roll) } else { 0.0 };
	f32 rc = if (cockpit_view) { cos_small(roll) } else { 1.0 };
	f32 rx = if (cockpit_view) { hz*rc+ux*rs } else { hz };
	f32 ry = if (cockpit_view) { uy*rs } else { 0.0 };
	f32 rz = if (cockpit_view) { -hx*rc+uz*rs } else { -hx };
	f32 upx = if (cockpit_view) { ux*rc-hz*rs } else { ux };
	f32 upy = if (cockpit_view) { uy*rc } else { uy };
	f32 upz = if (cockpit_view) { uz*rc+hx*rs } else { uz };
	f32 scale_y = if (viewport < 0.86) { 1.30 } else { 1.61 };
	f32 scale_x = scale_y/viewport;
	f32 near_far = 1.0015052;
	display[0] = rx*scale_x;
	display[1] = upx*scale_y;
	display[2] = vx*near_far;
	display[3] = vx;
	display[4] = if (cockpit_view) { ry*scale_x } else { 0.0 };
	display[5] = upy*scale_y;
	display[6] = vy*near_far;
	display[7] = vy;
	display[8] = rz*scale_x;
	display[9] = upz*scale_y;
	display[10] = vz*near_far;
	display[11] = vz;
	display[12] = if (cockpit_view) { -(rx*ex+ry*ey+rz*ez)*scale_x } else { -(hz*ex-hx*ez)*scale_x };
	display[13] = -(upx*ex+upy*ey+upz*ez)*scale_y;
	f32 offset = -(vx*ex+vy*ey+vz*ez);
	display[14] = offset*near_far-1.401053;
	display[15] = offset;
	display[16] = float_i(course);
	display[17] = float_i(stage_tick[0])/30.0;
	display[18] = poses[0].speed;
	display[19] = poses[0].y;
	display[20] = phase_code(phase[0]);
	display[21] = if (course == 1 && phase[0] == MissionPhase::mail_approach) { float_i(mail_status) } else { if (phase[0] == MissionPhase::crop_spray) { float_i(spray_status(0,0)) } else { 0.0 } };
	display[22] = float_i(result[0]);
	display[23] = float_i(best_ticks)/30.0;
	i32 remaining = if (stage_tick[0] < 8100) { 8100-stage_tick[0] } else { 0 };
	display[24] = float_i(if (result[0] == 1) { 250+remaining/9+ring_score[0]*80+(if (route[0] == 1) { 150 } else { 0 }) } else { 0 });
	display[25] = float_i(route[0]);
	display[26] = float_i(event_code[0]);
	MissionPhase stage = phase[0];
	f32 x = poses[0].x;
	f32 z = poses[0].z;
	f32 target_x = objective_x(stage,x,z);
	f32 target_z = objective_z(stage,x,z);
	f32 steer_x = target_x-x;
	f32 steer_z = target_z-z;
	f32 mx = abs_f(steer_x);
	f32 mz = abs_f(steer_z);
	display[27] = if (stage == MissionPhase::final_rollout || stage == MissionPhase::supply_rollout) { (if (stage == MissionPhase::supply_rollout) { pickup_z()+pickup_l()-34.0 } else { strip_z()+strip_l() })-z } else {
		if (mx > mz) { mx+0.41*mz } else { mz+0.41*mx }
	};
	f32 right = steer_x*hz-steer_z*hx;
	f32 ahead = steer_x*hx+steer_z*hz;
	display[28] = if (ahead <= 0.0) {
		if (right < 0.0) { -1.0 } else { 1.0 }
	} else { clamp(right*1.6/ahead,-1.0,1.0) };
	display[29] = if ((stage == MissionPhase::landing_approach || stage == MissionPhase::supply_approach) && result[0] == 0) {
		i32 issue = landing_issue(0,false);
		if (mx > (if (stage == MissionPhase::supply_approach) { pickup_w() } else { strip_w() })*0.42 || issue == 1) { 1.0 } else {
			if (issue == 0) { 4.0 } else { float_i(issue) }
		}
	} else { 0.0 };
	display[30] = if (stage == MissionPhase::seine_crossing && x > 25.0 && x < 54.0 && z >= 154.0 && poses[0].y < 11.5) { 1.0 } else { 0.0 };
	display[31] = if (course == 0) { float_i(spray_count[0]) } else { if (stage == MissionPhase::landing_approach || stage == MissionPhase::final_rollout) { 1.0 } else { 0.0 } };

	display[32] = float_i(ring_score[0]);
	i32 gate = next_gate[0];
	display[33] = float_i(gate);
	display[34] = if (gate < 3) { clamp(float_i(gate_deadline(gate)-stage_tick[0])/30.0,0.0,31.0) } else { 0.0 };
	display[35] = if (ring_celebrating()) { 1.0 } else { 0.0 };
	unsafe { host.frame(core.pointer_cast<*?u8>(&?display[0]),36); };
};

unit(i32) reset = fn(requested) {
	i32 next = if (requested == 1) { 1 } else { 0 };
	if (course != next) {
		map_plan = if (next == 1) { paris.course_layout() } else { wright.course_layout() };
		best_ticks = 0;
		world_ready = false;
	};
	course = next;
	cockpit_drive = 0.0;
	cancel_drop();
	spray_tick = -50;
	earned_gates = 0;
	gate_flash = -1;
	gate_flash_until = 0;
	reset_mission(0);
	reset_mission(1);
	accumulator = 0.0;

	spawn(0);
	spawn(1);
	retain_pose(0);
	retain_pose(1);
	present_pose(0,1.0);
	present_pose(1,1.0);
	if (!world_ready) { render_land(); world_ready = true; };
};

unit(f32,i32,f32) tick = fn(dt,input,aspect) {
	f32 accepted = if (dt >= 0.0 && dt < 0.20) { dt } else { 0.0 };
	viewport = if (aspect > 0.25 && aspect < 5.0) { aspect } else { 1.0 };
	accumulator = clamp(accumulator+accepted,0.0,0.17);
	if (held(input,128)) { pending_drop = true; };
	advance(canonical_input(input & -129),5);
	f32 alpha = if (result[0] == 0) { clamp(accumulator*30.0,0.0,1.0) } else { 1.0 };
	present_pose(0,alpha);
	i32 render_mail_status = 0;
	f32 render_impact_x = 0.0;
	f32 render_impact_z = 0.0;
	if (course == 1 && phase[0] == MissionPhase::mail_approach) {
		render_mail_status = mail_eligibility(0);
		if (render_mail_status == 0) {
			f32 lead = mail_lead(0);
			render_impact_x = predicted_mail_x(0,lead);
			render_impact_z = predicted_mail_z(0,lead);
			render_mail_status = mail_impact_status(render_impact_x,render_impact_z);
		};
	};
	draw_aircraft(alpha,render_mail_status,render_impact_x,render_impact_z);
	frame(render_mail_status);
};
%%end
