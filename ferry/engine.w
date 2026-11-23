%%start
host = extern wasm "ferry" {
    unsafe unit(*?u8, i32) world;
    unsafe unit(*?u8, i32) moving;
    unsafe unit(*?u8, i32) frame;
};

f32[6] empty_vertex = [0.0, 0.0, 0.0, 0.0, 0.0, 0.0];
f32[6][16] mesh_chunk_0 = [empty_vertex, empty_vertex, empty_vertex, empty_vertex, empty_vertex, empty_vertex, empty_vertex, empty_vertex, empty_vertex, empty_vertex, empty_vertex, empty_vertex, empty_vertex, empty_vertex, empty_vertex, empty_vertex];
f32[6][16][16] mesh_chunk_1 = [mesh_chunk_0, mesh_chunk_0, mesh_chunk_0, mesh_chunk_0, mesh_chunk_0, mesh_chunk_0, mesh_chunk_0, mesh_chunk_0, mesh_chunk_0, mesh_chunk_0, mesh_chunk_0, mesh_chunk_0, mesh_chunk_0, mesh_chunk_0, mesh_chunk_0, mesh_chunk_0];
f32[6][16][16][16] mesh_chunk_2 = [mesh_chunk_1, mesh_chunk_1, mesh_chunk_1, mesh_chunk_1, mesh_chunk_1, mesh_chunk_1, mesh_chunk_1, mesh_chunk_1, mesh_chunk_1, mesh_chunk_1, mesh_chunk_1, mesh_chunk_1, mesh_chunk_1, mesh_chunk_1, mesh_chunk_1, mesh_chunk_1];
f32[6][16][16][16][9] scenery = [mesh_chunk_2, mesh_chunk_2, mesh_chunk_2, mesh_chunk_2, mesh_chunk_2, mesh_chunk_2, mesh_chunk_2, mesh_chunk_2, mesh_chunk_2];
i32 scenery_capacity = 9*4096;
i32 moving_capacity = 24*256;
f32[6][16][16][24] moving_mesh = [mesh_chunk_1, mesh_chunk_1, mesh_chunk_1, mesh_chunk_1, mesh_chunk_1, mesh_chunk_1, mesh_chunk_1, mesh_chunk_1, mesh_chunk_1, mesh_chunk_1, mesh_chunk_1, mesh_chunk_1, mesh_chunk_1, mesh_chunk_1, mesh_chunk_1, mesh_chunk_1, mesh_chunk_1, mesh_chunk_1, mesh_chunk_1, mesh_chunk_1, mesh_chunk_1, mesh_chunk_1, mesh_chunk_1, mesh_chunk_1];

f32[30] display = [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0];
i32 vertex_count = 0;
bool drawing_world = false;
bool world_ready = false;
bool model_local = false;
bool shadow_pass = false;
i32 surface_paint = 0;
i32 paint_asphalt = 1;
i32 paint_masonry = 2;
i32 paint_canal = 3;
i32 paint_light_pool = 4;
i32 paint_lamp = 5;
i32 paint_wake = 6;
i32 paint_pier_signal = 7;
f32 model_x = 0.0;
f32 model_y = 0.0;
f32 model_z = 0.0;
f32 model_hs = 0.0;
f32 model_hc = 1.0;
f32 model_rs = 0.0;
f32 model_rc = 1.0;
u64(i32) ix = fn(value) { core.int_extend<u64>(value) };
f32(f32) abs_f = fn(value) { if (value < 0.0) { -value } else { value } };
f32(f32, f32, f32) clamp = fn(v, lo, hi) { if (v < lo) { lo } else { if (v > hi) { hi } else { v } } };
f32(f32) wrap = fn(a) { if (a > 3.14159265) { a - 6.28318530 } else { if (a < -3.14159265) { a + 6.28318530 } else { a } } };
f32(f32, f32) bearing = fn(x, z) {
    f32 ax=abs_f(x); f32 az=abs_f(z);
    bool steep=ax>az;
    f32 ratio=if (steep) { az/ax } else { ax/az };
    f32 angle=ratio*(0.78539816+0.273*(1.0-ratio));
    f32 quadrant=if (steep) { 1.57079633-angle } else { angle };
    f32 magnitude=if (z<0.0) { 3.14159265-quadrant } else { quadrant };
    if (x<0.0) { -magnitude } else { magnitude }
};
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
	if (i < (if (drawing_world) { scenery_capacity } else { moving_capacity })) {
		u64 high = ix(i / 4096);
		u64 layer = ix(i / 256 % 16);
		u64 row = ix(i / 16 % 16);
		u64 cell = ix(i % 16);
		f32 ux = if (model_local) { x * model_rc - y * model_rs } else { x };
		f32 uy = if (model_local) { x * model_rs + y * model_rc } else { y };
		f32 px = if (model_local) { model_x + ux*model_hc + z*model_hs } else { x };
		f32 py = if (model_local) { model_y + uy } else { y };
		f32 pz = if (model_local) { model_z - ux*model_hs + z*model_hc } else { z };
		f32 pr = clamp(r,0.0,1.0)+2.0*float_i(surface_paint);
		f32 pg = clamp(g,0.0,1.0);
		f32 pb = if (shadow_pass) { b } else { clamp(b,0.0,1.0) };
		if (drawing_world) {
			scenery[high][layer][row][cell][0] = px;
			scenery[high][layer][row][cell][1] = py;
			scenery[high][layer][row][cell][2] = pz;
			scenery[high][layer][row][cell][3] = pr;
			scenery[high][layer][row][cell][4] = pg;
			scenery[high][layer][row][cell][5] = pb;
		} else {
			u64 moving_layer = ix(i / 256);
			moving_mesh[moving_layer][row][cell][0] = px;
			moving_mesh[moving_layer][row][cell][1] = py;
			moving_mesh[moving_layer][row][cell][2] = pz;
			moving_mesh[moving_layer][row][cell][3] = pr;
			moving_mesh[moving_layer][row][cell][4] = pg;
			moving_mesh[moving_layer][row][cell][5] = pb;
		};
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

f32(f32) sq = fn(v) { v*v };
f32(f32,f32) length = fn(x,z) {
    f32 hi = if (abs_f(x)>abs_f(z)) { abs_f(x) } else { abs_f(z) };
    f32 lo = if (abs_f(x)>abs_f(z)) { abs_f(z) } else { abs_f(x) };
    if (hi <= 0.00001) { 0.0 } else {
        f32 ratio = lo/hi;
        f32 value = 1.0+ratio*ratio;
        f32 first = 1.0+0.5*ratio*ratio;
        hi*0.5*(first+value/first)
    }
};
f32(f32,f32) min_f = fn(a,b) { if (a<b) { a } else { b } };
f32(f32,f32) max_f = fn(a,b) { if (a>b) { a } else { b } };

f32[5][36] buildings = [
    [-31.0, -10.0, 11.0, 13.0, 9.2],
    [-11.1, -8.0, 5.1, 12.6, 5.0],
    [7.8, -10.0, 16.0, 13.5, 10.8],
    [-31.0, 7.0, 11.0, 17.5, 12.0],
    [-11.5, 6.5, 5.5, 16.5, 7.8],
    [11.0, 9.0, 14.2, 18.5, 7.2],
    [-31.0, 33.0, 11.0, 19.8, 13.6],
    [-12.0, 33.8, 6.0, 16.8, 9.5],
    [14.4, 33.0, 12.0, 17.5, 6.2],
    [5.8, 29.7, 4.2, 18.0, 5.8],
    [6.0, 54.4, 4.4, 10.8, 6.5],
    [17.0, 55.2, 12.0, 12.5, 8.3],
    [-30.0, 62.8, 15.8, 8.4, 7.1],
    [-12.0, 62.8, 6.1, 8.4, 5.6],
    [19.8, 71.0, 8.3, 4.4, 3.4],
    [-103.0,-11.0,19.0,21.0,13.8],[-77.0,-12.0,10.0,15.5,8.9],
    [-54.0,-12.0,15.0,16.3,12.5],[-43.3,8.5,8.9,14.7,17.5],
    [-96.0,8.1,16.5,11.25,11.6],[-76.7,8.2,10.3,11.15,7.4],
    [-54.5,8.8,8.3,13.1,11.9],[-106.0,34.0,17.0,16.5,9.1],
    [-75.0,42.5,7.0,9.0,8.3],[-53.6,34.2,14.1,17.0,12.4],
    [-99.5,63.0,20.0,8.1,6.0],[-75.5,63.1,8.2,8.0,10.9],
    [-55.5,63.8,12.5,7.6,9.2],[-39.6,63.9,4.6,7.1,7.9],[-88.8,41.00,14.0,9.15,4.65],
    [-121.0,33.3,6.0,5.2,3.6],[-136.0,33.3,7.0,5.6,4.1],[-153.5,33.3,10.0,5.4,3.4],
    [-121.0,46.4,6.0,6.1,3.8],[-136.0,46.4,7.0,6.2,4.6],[-153.5,46.4,10.0,6.2,3.9]
];
f32[2][12] trees = [
    [5.4,22.0],[-5.1,19.0],[13.5,24.7],[5.0,54.0],[-5.2,45.0],[-18.7,18.0],
    [-13.0,54.4],[-24.0,56.8],[15.2,61.9],[22.8,7.0],[4.8,69.0],[25.1,60.2]
];
f32[2][4] mailbox_home = [[3.9,18.0],[-4.4,38.0],[12.4,50.4],[-13.6,57.4]];
f32[4] empty_prop = [0.0,0.0,0.0,0.0];
f32[4][4] mailbox = [empty_prop,empty_prop,empty_prop,empty_prop];
struct copy Pedestrian {
    f32 x;
    f32 z;
    bool toward_second_waypoint;
    f32 stun_seconds;
    f32 slide_x;
    f32 slide_z;
    f32 gait_phase;
}
Pedestrian empty_ped = {
    .x=0.0; .z=0.0; .toward_second_waypoint=false; .stun_seconds=0.0;
    .slide_x=0.0; .slide_z=0.0; .gait_phase=0.0;
};
Pedestrian[9] peds = [empty_ped,empty_ped,empty_ped,empty_ped,empty_ped,empty_ped,empty_ped,empty_ped,empty_ped];
f32[4][9] sidewalks = [
    [5.1,14.0,6.3,24.0],[-5.1,10.7,-5.1,29.5],[12.0,33.5,12.5,59.0],
    [5.2,46.0,4.8,67.4],[-13.5,33.0,-13.5,54.0],[7.0,73.2,15.2,73.2],
    [-89.20,33.6,-76.15,33.6],[-102.25,52.5,-64.10,52.5],[-83.4,72.3,-47.2,72.3]
];
f32[2][6] traffic_home = [[2.0,25.0],[-2.0,55.0],[2.0,61.0],[-2.0,35.0],[-96.0,27.05],[-46.0,31.02]];
struct copy TrafficVehicle {
    f32 x;
    f32 z;
    f32 signed_lane_direction;
    f32 speed;
}
TrafficVehicle empty_vehicle = { .x=0.0; .z=0.0; .signed_lane_direction=0.0; .speed=0.0; };
TrafficVehicle[6] traffic = [empty_vehicle,empty_vehicle,empty_vehicle,empty_vehicle,empty_vehicle,empty_vehicle];
f32[2] initial_position = [0.0,0.0];
f32[2][6] previous_traffic = [initial_position,initial_position,initial_position,initial_position,initial_position,initial_position];
f32 contact_x = 0.0;
f32 contact_z = 0.0;
f32 enter_time = 0.0;
f32 exit_time = 1.0;
f32 traffic_time = 1.0;
f32 car_x = 0.0;
f32 car_z = -5.0;
f32 car_yaw = 0.0;
f32 vx = 0.0;
f32 vz = 0.0;
f32 brake_mark = 0.0;
f32 car_roll = 0.0;
f32 foot_x = 2.1;
f32 foot_z = -4.6;
f32 foot_speed = 0.0;
f32 foot_yaw = 0.0;
f32 camera_x = 2.1;
f32 camera_z = -12.0;
f32 camera_y = 4.1;
f32 camera_yaw = 0.0;
f32 old_x = 0.0;
f32 old_z = -5.0;
f32 old_yaw = 0.0;
f32 wheel_phase = 0.0;
f32 previous_wheel_phase = 0.0;
f32 old_foot_x = 2.1;
f32 old_foot_z = -4.6;
f32 old_foot_yaw = 0.0;
f32 old_camera_x = 2.1;
f32 old_camera_y = 4.1;
f32 old_camera_z = -12.0;
f32 old_camera_yaw = 0.0;
f32 camera_pitch = -0.25;
bool wide_camera = false;
f32 camera_width = 0.0;
f32 old_camera_width = 0.0;
f32 accumulator = 0.0;
f32 viewport = 1.0;
f32 seconds_left = 90.0;
f32 collision_wait = 0.0;
i32 collision_kind = 0;
i32 collision_seq = 0;
enum copy MissionStage {
    pickup_tape;
    reach_pier;
    delivered;
    missed_departure;
    free_roam;
    crossing;
    docked;
    disembarking;
    answer_phone;
}
MissionStage stage = MissionStage::pickup_tape;

i32(MissionStage) mission_stage_code = fn(current) {
    if (current==MissionStage::pickup_tape) { 0 } else {
        if (current==MissionStage::reach_pier) { 1 } else {
            if (current==MissionStage::delivered) { 2 } else {
                if (current==MissionStage::missed_departure) { 3 } else {
                    if (current==MissionStage::free_roam) { 4 } else {
                        if (current==MissionStage::crossing) { 5 } else {
                            if (current==MissionStage::docked) { 6 } else {
                                if (current==MissionStage::disembarking) { 7 } else { 8 }
                            }
                        }
                    }
                }
            }
        }
    }
};
bool in_car = false;
bool pending_action = false;
f32 phone_x = 3.80;
f32 phone_z = -1.60;
f32 tape_x = -82.0;
f32 backstreet_z = -14.25;
f32 backstreet_x = -60.3;
f32 shop_service_z = 22.65;
f32[3][4] pickup_route = [[0.0,-14.25,1.8],[-60.3,-14.25,2.3],[-60.3,22.65,1.6],[-82.0,22.65,2.0]];
f32[3][7] return_route = [[-102.0,22.65,2.3],[-107.85,32.5,1.8],[-108.4,52.0,1.5],[-106.0,57.15,1.5],
    [-100.0,58.5,2.0],[-9.0,58.6,2.2],[-5.80,58.6,1.3]];
f32 park_x = -5.80;
f32 park_z = 58.60;
i32 pickup_leg = 0;
i32 return_leg = 0;
bool bypass = true;
bool park_walk = false;
f32[2][3] waterfront_route = [[-64.8,38.4],[-64.8,73.45],[8.10,73.55]];
i32 waterfront_leg = -1;
f32 avenue_prep_x = -79.0;
f32[3][10] avenue_route = [[-102.0,22.65,2.2],[-107.7,20.8,1.8],[-108.0,17.1,1.8],[-104.5,14.85,1.8],
    [-100.6,17.65,1.7],[-98.5,22.0,1.7],[-62.8,22.65,2.0],[-59.0,26.9,1.9],[-36.5,27.05,2.0],[-9.5,26.0,1.3]];
f32[2][4] avenue_foot = [[-9.5,30.2],[3.9,30.2],[3.9,70.7],[8.10,73.55]];
i32 avenue_leg = -1;
i32 avenue_walk_leg = -1;
f32 tape_z = 36.6;
f32[2][3] pickup_foot = [[3.80,-4.6],[3.80,28.9],[-82.0,28.9]];
f32 dock_x = 11.0;
f32 dock_z = 83.0;
f32 harbor_traffic_end = 69.9;
f32 harbor_bollard_z = 72.2;
f32 harbor_crosswalk_z = 73.55;
f32 berth_z = 88.0;
f32 ferry_z = 88.0;
f32 old_ferry_z = 88.0;
f32 deck_y = 1.22;
f32 board_time = 0.0;
f32 board_x = 0.0;
f32 board_z = 0.0;
f32 board_height = 0.01;
f32 old_board_height = 0.01;
f32 arrival_z = 116.4;
f32 far_gangway_x = 14.03;
f32 far_gangway_start = 124.25;
f32 far_landing_z = 127.1;
f32 dt_step = 0.016666667;
f32 dt_vehicle = 0.008333333;

unit(f32,f32,f32,f32,f32,f32,f32,f32) ground = fn(x,z,w,d,h,r,g,b) {
    quad(x,h,z,x+w,h,z,x+w,h,z+d,x,h,z+d,r,g,b);
};

unit(i32,i32,f32,f32,f32,f32,f32,f32,f32) facade = fn(i,j,x,z,w,d,h,cr,cg) {
    if (i < 5 && j < 3) {
        f32 fy = 1.45+float_i(j)*(h-1.65)/3.0;
        f32 ww = (w-1.3)/5.0;
        f32 fx = x+0.65+float_i(i)*ww;
        f32 hh = (h-1.55)*0.17;
        f32 fwd=z-0.015; f32 rear=z+d+0.016;
        bool lit=(i*3+j*7+core.float_to_sint_trunc<i32>(x+167.0))%5<2;
        f32 wr=if (lit) { 0.86 } else { 0.15 };
        f32 wg=if (lit) { 0.58 } else { 0.24 };
        f32 wb=if (lit) { 0.39 } else { 0.36 };
        quad(fx,fy,fwd,fx+ww*0.69,fy,fwd,fx+ww*0.69,fy+hh,fwd,fx,fy+hh,fwd,wr,wg,wb);
        quad(fx,fy-0.11,fwd,fx+ww*0.72,fy-0.11,fwd,fx+ww*0.72,fy-0.025,fwd,fx,fy-0.025,fwd,cr*0.75,cg*0.75,0.51);
        quad(fx,fy,rear,fx+ww*0.68,fy,rear,fx+ww*0.68,fy+hh,rear,fx,fy+hh,rear,0.23,0.33,0.42);
        if (i==0 || i==2 || i==4) {
            f32 l=x-0.018; f32 e=x+w+0.018; f32 along=z+0.5+float_i(i)*d/5.0;
            f32 end=along+d*0.115;
            quad(l,fy,along,l,fy,end,l,fy+hh,end,l,fy+hh,along,0.21,0.29,0.44);
            quad(e,fy,along,e,fy,end,e,fy+hh,end,e,fy+hh,along,0.19,0.27,0.39);
        };
        if (i==4) { facade(0,j+1,x,z,w,d,h,cr,cg); }
        else { facade(i+1,j,x,z,w,d,h,cr,cg); };
    };
};

unit(i32,f32,f32,f32,f32) shop_front = fn(i,x,z,w,d) {
    f32 side=if (x<0.0) { 1.0 } else { -1.0 };
    f32 edge=if (x<0.0) { x+w } else { x };
    f32 q=z+d*0.23;
    f32 back=edge+side*0.026;
    f32 ext=edge+side*0.71;
    f32 er=min_f(back,ext);
    f32 trim=if (i%2==0) { 0.86 } else { 0.48 };
    quad(back,0.18,q,back,0.18,q+d*0.40,back,2.21,q+d*0.40,back,2.21,q,0.23,0.34,0.43);
    quad(back+side*0.011,0.25,q+0.40,back+side*0.011,0.25,q+d*0.40-0.32,
         back+side*0.011,1.87,q+d*0.40-0.32,back+side*0.011,1.87,q+0.40,0.68,0.46,0.40);
    quad(back+side*0.020,0.22,q+d*0.20,back+side*0.020,0.22,q+d*0.20+0.84,
         back+side*0.020,1.98,q+d*0.20+0.84,back+side*0.020,1.98,q+d*0.20,0.28,0.35,0.48);
    box(er,2.21,q-0.20,0.72,0.15,d*0.40+0.39,trim,0.38,0.58);
    box(er-0.03,2.37,q-0.24,0.79,0.071,d*0.40+0.47,0.92,0.59,0.54);
    box(er,2.14,q-0.11,0.65,0.047,d*0.40+0.22,0.43,0.58,0.62);
};

unit(i32) draw_buildings = fn(i) {
    if (i<30) {
        u64 n=ix(i);
        f32 x=buildings[n][0]; f32 z=buildings[n][1]; f32 w=buildings[n][2]; f32 d=buildings[n][3]; f32 h=buildings[n][4];
        f32 r=if (i%3==0) { 0.74 } else { if (i%3==1) { 0.49 } else { 0.79 } };
        f32 g=if (i%3==0) { 0.49 } else { if (i%3==1) { 0.61 } else { 0.64 } };
        f32 b=if (i%3==0) { 0.62 } else { 0.60 };
        if (i<29) {
        box(x,0.0,z,w,h,d,r,g,b);
        box(x-0.2,h*0.71,z-0.19,w+0.4,0.17,d+0.38,0.91,0.87,0.73);
        box(x-0.25,h-0.22,z-0.23,w+0.5,0.24,d+0.46,0.93,0.88,0.77);
        box(x+0.65,h,z+0.65,w-1.3,0.50,d-1.3,r*0.76,g*0.76,b*0.76);
        box(x+1.0,h+0.50,z+1.0,w-2.0,0.31,d-2.0,0.80,0.77,0.71);
        facade(0,0,x,z,w,d,h,r,g);
        if (i<14 || i%3==1) { shop_front(i,x,z,w,d); };
        };
        draw_buildings(i+1);
    };
};

unit(i32) draw_palms = fn(i) {
    if (i<12) {
        f32 x=trees[ix(i)][0]; f32 z=trees[ix(i)][1];
        f32 ht=4.0+0.34*float_i(i%4);
        box(x-0.20,0.0,z-0.20,0.40,ht,0.40,0.47,0.30,0.21);
        diamond(x,ht-0.22,z,1.61,0.82,0.12,0.57,0.30);
        quad(x-2.1,ht-0.41,z,x-0.4,ht+0.20,z-0.50,x+2.1,ht-0.40,z,x+0.40,ht+0.21,z+0.50,0.17,0.63,0.34);
        quad(x,ht-0.35,z-2.1,x+0.56,ht+0.22,z-0.4,x,ht-0.39,z+2.0,x-0.56,ht+0.22,z+0.4,0.18,0.62,0.32);
        draw_palms(i+1);
    };
};

unit(i32) paint_road = fn(i) {
    if (i<18) {
        f32 z=-14.0+5.0*float_i(i);
        ground(-0.065,z,0.13,2.1,0.022,0.88,0.74,0.38);
        ground(-4.09,z,0.10,4.0,0.021,0.82,0.78,0.67);
        ground(3.99,z,0.10,4.0,0.021,0.82,0.78,0.67);
        if (z<23.0 || (z>33.1 && z<54.1) || z>62.5) {
            ground(-5.68,z,1.08,0.045,0.014,0.42,0.33,0.37);
            ground(4.60,z,0.97,0.045,0.014,0.42,0.33,0.37);
        };
        if (i%3==1) {
            box(-5.7,0.0,z,0.14,3.9,0.14,0.18,0.30,0.32);
            box(-5.7,3.85,z,1.20,0.14,0.12,0.20,0.33,0.36);
            box(-4.65,3.76,z-0.10,0.38,0.10,0.28,0.97,0.76,0.47);
        };
        paint_road(i+1);
    };
};

unit(i32) crosswalk = fn(i) {
    if (i<9) {
        f32 x=-3.85+0.89*float_i(i);
        ground(x,29.1,0.47,2.15,0.024,0.91,0.83,0.70);
        ground(x,57.5,0.47,2.15,0.024,0.91,0.83,0.70);
        ground(x,harbor_crosswalk_z-0.44,0.47,0.88,0.035,0.83,0.91,0.70);
        if (i<5) {
            f32 post_x=-3.8+1.9*float_i(i);
            box(post_x-0.12,0.02,harbor_bollard_z-0.12,0.24,0.80,0.24,0.38,0.60,0.57);
            box(post_x-0.13,0.69,harbor_bollard_z-0.13,0.26,0.12,0.26,0.98,0.84,0.48);
        };
        crosswalk(i+1);
    };
};

i32[6][5] sign_letters = [[31183,31597,24573,31183,29391,9367],[11117,29847,15211,29391,31599,0],[4843,29847,29391,23275,0,31727],[23549,23530,23275,29847,24573,23530],[4843, 23533, 31599, 24573, 29391, 0]];

unit(i32,i32,f32,f32,f32,f32,bool,f32,f32,f32) glyph = fn(bits,bit,x,y,z,k,side,r,g,b) {
    if (bits>0 && bit<15) {
        if (bits%2==1) {
            f32 dx=float_i(bit%3)*k;
            f32 yy=y+float_i(4-bit/3)*k;
            f32 w=k*0.86;
            if (side) {
                f32 dz=z-dx;
                quad(x,yy,dz,x,yy+w,dz,x,yy+w,dz-w,x,yy,dz-w,r,g,b);
            } else {
                f32 xx=x+dx;
                quad(xx,yy,z,xx+w,yy,z,xx+w,yy+w,z,xx,yy+w,z,r,g,b);
            };
        };
        glyph(bits/2,bit+1,x,y,z,k,side,r,g,b);
    };
};

unit(i32,i32,f32,f32,f32,f32,bool,f32,f32,f32) neon_words = fn(word,i,x,y,z,k,side,r,g,b) {
    if (i<6) {
        f32 offset=float_i(i)*4.0*k;
        f32 xx=if (side) { x } else { x+offset };
        f32 zz=if (side) { z-offset } else { z };
        glyph(sign_letters[ix(word)][ix(i)],0,xx,y,zz,k,side,r,g,b);
        neon_words(word,i+1,x,y,z,k,side,r,g,b);
    };
};

unit(f32,f32) draw_shop = fn(x,z) {
    box(x,0.10,z,14.0,0.30,9.25,0.48,0.33,0.35);
    box(x,0.40,z,14.0,4.65,0.85,0.40,0.41,0.57);
    box(x,0.40,z+0.85,0.72,4.65,8.40,0.54,0.44,0.61);
    box(x+13.31,0.40,z+0.85,0.69,4.65,8.4,0.54,0.44,0.61);
    box(x-0.55,4.19,z-0.68,15.1,0.25,10.05,0.88,0.46,0.64);
    box(x-0.79,4.45,z-0.87,15.65,0.22,10.41,0.45,0.83,0.80);
    box(x-0.63,4.69,z-0.70,15.40,0.27,10.08,0.84,0.66,0.62);
    box(x+1.05,4.97,z-0.15,11.90,0.25,8.33,0.37,0.33,0.49);
    box(x+4.2,4.98,z+0.30,5.6,1.88,0.40,0.37,0.25,0.42);
    box(x+4.03,4.98,z+0.20,5.94,0.10,0.52,1.0,0.42,0.64);
    box(x+4.03,6.77,z+0.20,5.94,0.12,0.52,1.0,0.42,0.64);
    box(x+4.30,5.12,z+0.26,5.41,0.71,0.01,0.30,0.19,0.34);
    neon_words(0,0,x+4.89,5.93,z+0.19,0.179,false,1.0,0.84,0.45);
    neon_words(1,0,x+5.56,5.14,z+0.18,0.149,false,0.56,0.98,0.86);
    box(x+0.58,0.42,z-1.05,4.12,2.75,0.024,0.25,0.56,0.65);
    box(x+9.30,0.42,z-1.05,4.12,2.75,0.024,0.25,0.56,0.65);
    box(x+2.50,0.43,z-1.10,0.12,2.75,0.15,0.52,0.76,0.74);
    box(x+11.41,0.43,z-1.10,0.12,2.75,0.15,0.52,0.76,0.74);
    box(x+0.63,1.19,z-1.09,4.06,0.10,0.05,0.49,0.66,0.70);
    box(x+9.33,1.19,z-1.09,4.08,0.10,0.05,0.49,0.66,0.70);
    box(x+0.63,2.14,z-1.09,4.06,0.09,0.05,0.49,0.66,0.70);
    box(x+9.33,2.14,z-1.09,4.08,0.09,0.05,0.49,0.66,0.70);
    ground(x+0.52,z-1.78,12.98,0.49,0.036,0.65,0.45,0.48);
    ground(x+0.36,z-2.16,13.34,0.48,0.028,0.53,0.40,0.48);
};

f32 pier_marquee_x = 6.94;
f32 pier_marquee_z = 75.10;
f32 pier_marquee_floor = 3.69;
f32 pier_marquee_width = 8.19;
f32 pier_signal_x = 15.22;
f32 pier_signal_z = 80.50;

unit() pier_signal_housing = fn {
    box(pier_signal_x-0.07,0.02,pier_signal_z+0.02,0.14,2.29,0.17,0.27,0.31,0.41);
    box(pier_signal_x-0.31,1.71,pier_signal_z,0.62,0.77,0.23,0.39,0.33,0.43);
    box(pier_signal_x-0.35,2.47,pier_signal_z-0.11,0.70,0.13,0.35,0.59,0.43,0.44);
};

unit() draw_landmarks = fn {
    box(7.04,2.77,1.4,0.76,1.50,7.3,0.28,0.22,0.38);
    box(6.99,4.27,1.35,0.94,0.12,7.41,0.89,0.46,0.62);
    box(6.98,2.77,1.35,0.94,0.11,7.41,0.45,0.82,0.79);
    neon_words(3,0,7.032,3.04,8.11,0.266,true,1.0,0.80,0.50);
    box(7.18,0.02,75.25,0.21,4.04,0.21,0.34,0.28,0.37);
    box(14.64,0.02,75.25,0.21,4.04,0.21,0.34,0.28,0.37);
    box(7.02,3.72,75.13,8.03,1.40,0.45,0.40,0.30,0.45);
    box(pier_marquee_x,5.14,pier_marquee_z,pier_marquee_width,0.10,0.51,0.48,0.83,0.83);
    box(pier_marquee_x,pier_marquee_floor,pier_marquee_z,pier_marquee_width,0.10,0.51,0.90,0.46,0.62);
    neon_words(2,0,8.26,3.94,75.08,0.234,false,0.98,0.83,0.53);
};

i32 annex_middle_road = 23;
i32 map_road_count = 24;
f32[4][24] map_roads = [
    [-111.0,25.35,110.0,7.65],
    [-111.0,54.5,112.0,7.6],
    [-65.0,-17.0,9.0,91.5],
    [-111.0,29.1,8.0,33.4],
    [-4.45,-20.0,8.9,94.4],
    [-18.8,-12.0,5.8,85.4],
    [-18.8,27.6,26.2,5.9],
    [-18.8,57.0,23.3,5.1],
    [-14.0,125.0,50.0,20.0],
    [-63.20,-1.77,68.0,3.54],
    [-103.85,-2.45,47.79,4.90],
    [-127.0,25.35,16.0,7.65],[-143.0,25.35,16.0,7.65],[-159.0,25.35,16.0,7.65],
    [-127.0,40.0,14.0,5.6],[-143.0,40.0,16.0,5.6],[-159.0,40.0,16.0,5.6],
    [-127.0,54.5,16.0,7.6],[-143.0,54.5,16.0,7.6],[-159.0,54.5,16.0,7.6],
    [-127.0,27.0,5.4,33.0],[-143.0,27.0,5.4,33.0],[-159.0,27.0,5.0,33.0],
    [-113.0,40.0,5.5,5.6]
];

f32(i32) road_z = fn(row) {
    f32 z=map_roads[ix(row)][1];
    if (row==9) { backstreet_z+z } else { if (row==10) { shop_service_z+z } else { z } }
};

f32(i32,i32) map_value = fn(row,column) {
    if (row>=0 && row<map_road_count && column>=0 && column<4) { if (column==1) { road_z(row) } else { map_roads[ix(row)][ix(column)] } } else {
        if (row==-1 && column==0) { float_i(map_road_count) } else { 0.0 }
    }
};

unit(i32,f32,f32,f32,f32) road_ground = fn(row,h,r,g,b) {
    u64 index=ix(row);
    surface_paint=paint_asphalt;
    ground(map_roads[index][0],road_z(row),map_roads[index][2],map_roads[index][3],h,r,g,b);
    surface_paint=0;
};

unit(i32) district = fn(i) {
    if (i==0) {
        road_ground(0,0.014,0.20,0.22,0.31);
        road_ground(1,0.014,0.22,0.24,0.33);
        road_ground(2,0.014,0.20,0.23,0.32);
        road_ground(3,0.014,0.21,0.24,0.35);
        ground(-79.0,33.95,15.0,5.0,0.018,0.55,0.37,0.46);
        ground(-102.1,34.15,14.0,19.75,0.015,0.36,0.34,0.43);
        ground(-87.8,45.6,10.9,7.9,0.011,0.29,0.39,0.41);
        ground(-110.8,70.9,74.0,0.25,0.029,0.80,0.59,0.53);
    };
    if (i<18) {
        f32 px=-108.0+6.15*float_i(i);
        ground(px,28.9,2.75,0.12,0.026,0.84,0.64,0.36);
        ground(px,58.26,2.75,0.12,0.026,0.87,0.71,0.42);
        f32 pz=-12.0+4.9*float_i(i);
        ground(-60.1,pz,0.13,2.35,0.026,0.83,0.60,0.34);
        if (i%2==0) {
            box(px,0.012,25.04,0.15,3.77,0.15,0.28,0.22,0.36);
            box(px,3.62,25.04,0.85,0.14,0.15,0.28,0.22,0.36);
            box(px+0.65,3.50,24.97,0.41,0.13,0.27,1.0,0.68,0.37);
            ground(px-0.52,25.53,2.3,2.2,0.020,0.29,0.25,0.31);
        };
        district(i+1);
    };
};

unit(i32) promenade = fn(i) {
    if (i<20) {
        f32 x=-108.2+5.25*float_i(i);
        f32 z=68.9+0.71*float_i(i%3);
        f32 h=3.54+0.61*float_i(i%4);
        if (i%2==0) {
            ground(x-0.79,z-0.67,1.58,1.35,0.031,0.32,0.30,0.37);
            box(x-0.13,0.03,z-0.13,0.26,h,0.26,0.42,0.28,0.30);
            diamond(x,h-0.15,z,1.23,0.75,0.25,0.52,0.45);
            quad(x-1.69,h-0.46,z, x-0.44,h+0.25,z-0.27, x+1.61,h-0.41,z, x+0.34,h+0.11,z+0.36,0.21,0.47,0.46);
            quad(x,h-0.51,z-1.39, x+0.31,h+0.09,z-0.34, x+0.17,h-0.37,z+1.49, x-0.33,h+0.18,z+0.30,0.33,0.55,0.47);
        } else {
            box(x-0.19,0.05,z,1.8,0.36,0.48,0.52,0.32,0.37);
            box(x-0.20,0.37,z-0.055,1.83,0.29,0.12,0.60,0.36,0.37);
        };
        promenade(i+1);
    };
};

unit(i32) draw_harbor = fn(i) {
    if (i<14) {
        f32 x=-111.0+8.0*float_i(i);
        box(x,0.032,73.95,0.17,1.22,0.18,0.35,0.29,0.36);
        box(x,1.10,74.0,7.98,0.14,0.11,0.55,0.39,0.41);
        box(x,-0.15,74.55,7.94,0.31,0.39,0.43,0.31,0.35);
        if (i%3==0) {
            f32 z=76.0+float_i(i%4)*1.4;
            ground(x,z,5.6,0.12,-0.022,0.27,0.49,0.55);
            ground(x-2.53,z+2.3,3.80,0.10,-0.021,0.25,0.44,0.54);
            ground(x+0.6,z+5.2,3.81,0.085,-0.020,0.30,0.54,0.56);
        };
        draw_harbor(i+1);
    };
};

unit(i32) draw_skyline = fn(i) {
    if (i<30) {
        f32 x=-210.0+11.7*float_i(i);
        f32 wave=float_i((i*13+5)%17);
        f32 h=9.0+wave*1.17;
        f32 z=139.0+float_i(i%4)*6.3;
        box(x,0.0,z,7.0+float_i(i%3),h,6.9,0.28,0.26,0.38);
        if (i%3==0) {
            box(x+0.9,h,z+0.65,4.3,1.25+wave*0.37,4.8,0.35,0.29,0.42);
            box(x+2.0,h+1.25+wave*0.37,z+2.15,0.24,2.0,0.24,0.36,0.30,0.40);
        };
        if (i%2==1) {
            box(x+0.9,h-2.9,z-0.01,0.65,0.35,0.05,0.69,0.47,0.51);
            box(x+2.45,h-1.65,z-0.01,0.70,0.34,0.05,0.75,0.55,0.48);
            box(x+4.15,h-4.26,z-0.01,0.59,0.36,0.05,0.75,0.55,0.48);
        };
        draw_skyline(i+1);
    };
};

unit(i32) draw_annex_roads = fn(i) {
    if (i<annex_middle_road) {
        road_ground(i,0.018,0.26,0.30,0.37);
        draw_annex_roads(i+1);
    };
};

unit(i32) draw_annex_buildings = fn(i) {
    if (i<36) {
        u64 n=ix(i);
        f32 x=buildings[n][0]; f32 z=buildings[n][1]; f32 w=buildings[n][2]; f32 d=buildings[n][3]; f32 h=buildings[n][4];
        f32 r=if (i%2==0) { 0.57 } else { 0.69 };
        surface_paint=paint_masonry;
        box(x,0.0,z,w,h,d,r,0.51,0.49);
        surface_paint=0;
        box(x,h,z,w,0.18,d,0.88,0.77,0.62);
        facade(0,0,x,z,w,d,h,r,0.51);
        draw_annex_buildings(i+1);
    };
};

unit(i32,f32,f32) lamp_pool_fan = fn(i,x,z) {
    if (i<8) {
        f32 a=wrap(float_i(i)*0.78539816);
        f32 b=wrap(float_i(i+1)*0.78539816);
        put(x,0.029,z,1.0,0.27,0.0);
        put(x+3.2*cos_small(a),0.029,z+4.2*sin_small(a),1.0,0.0,0.0);
        put(x+3.2*cos_small(b),0.029,z+4.2*sin_small(b),1.0,0.0,0.0);
        lamp_pool_fan(i+1,x,z);
    };
};

unit(f32,f32,f32) dusk_lamp = fn(x,z,reach) {
    f32 lantern=x+reach;
    box(x-0.051,0.016,z-0.051,0.102,3.56,0.102,0.24,0.25,0.39);
    box(min_f(x,lantern)-0.051,3.43,z-0.052,abs_f(reach)+0.103,0.09,0.104,0.28,0.26,0.41);
    surface_paint=paint_lamp;
    box(lantern-0.15,3.32,z-0.12,0.30,0.13,0.24,1.0,0.71,0.40);
    surface_paint=paint_light_pool;
    lamp_pool_fan(0,lantern,z);
    surface_paint=0;
};

unit() working_wharf = fn {
    box(16.35,-0.43,86.5,7.70,0.75,16.10,0.30,0.36,0.43);
    box(16.28,0.30,86.43,7.84,0.13,16.26,0.48,0.48,0.48);
    box(16.64,0.45,90.25,1.68,1.19,1.48,0.52,0.34,0.25);
    box(16.90,1.65,90.35,1.28,0.79,1.19,0.53,0.42,0.30);
    box(18.85,0.45,88.85,1.65,1.18,2.35,0.29,0.46,0.50);
    box(19.10,1.64,89.12,1.15,0.70,1.49,0.37,0.52,0.55);
    box(19.92,0.44,97.00,1.27,0.76,1.35,0.37,0.37,0.49);
    box(20.27,1.20,97.36,0.56,6.80,0.60,0.36,0.40,0.51);
    box(16.70,7.57,97.34,7.15,0.36,0.67,0.74,0.46,0.28);
    box(22.06,7.92,97.15,1.60,0.51,1.04,0.40,0.40,0.52);
    box(17.48,7.53,97.60,0.085,0.01,0.085,0.30,0.35,0.44);
    box(17.48,3.02,97.60,0.085,4.52,0.085,0.29,0.32,0.42);
    box(17.28,2.81,97.48,0.46,0.23,0.34,0.74,0.52,0.32);
    box(16.35,0.48,86.59,0.12,0.84,15.93,0.40,0.45,0.53);
    box(16.33,1.33,86.57,0.16,0.14,15.97,0.84,0.67,0.47);
};

unit() phone_corner = fn {
    ground(phone_x-0.86,phone_z-0.69,1.72,1.14,0.022,0.34,0.29,0.35);
    ground(phone_x-0.86,phone_z-0.69,1.72,0.07,0.025,0.87,0.69,0.37);
    ground(phone_x-0.86,phone_z-0.68,0.07,1.10,0.025,0.87,0.69,0.37);
    ground(phone_x+0.79,phone_z-0.68,0.07,1.10,0.025,0.87,0.69,0.37);
    box(phone_x-0.43,1.65,-1.11,0.86,0.28,0.21,0.44,0.25,0.37);
    box(phone_x-0.45,1.63,-1.14,0.90,0.046,0.24,0.94,0.62,0.37);
    neon_words(4,0,phone_x-0.36,1.71,-1.115,0.036,false,1.0,0.88,0.51);
    box(7.57,0.58,-6.1,0.26,2.04,2.17,0.29,0.52,0.54);
    box(7.55,0.58,-3.45,0.28,2.04,2.43,0.47,0.34,0.34);
    box(7.52,1.11,-6.00,0.05,1.34,1.93,0.85,0.64,0.42);
    box(7.51,1.12,-3.28,0.05,1.36,2.08,0.95,0.73,0.45);
    box(7.45,1.09,-6.04,0.11,0.09,4.91,0.61,0.42,0.33);
    box(7.44,1.83,-6.04,0.11,0.063,4.91,0.47,0.32,0.32);
    box(6.85,2.76,-6.31,1.07,0.14,5.55,0.29,0.48,0.54);
    box(6.84,2.68,-6.35,0.047,0.24,5.62,0.79,0.51,0.38);
};

unit(f32,f32,i32) video_card = fn(x,z,design) {
    f32 r=if (design%3==0) { 0.91 } else { if (design%3==1) { 0.42 } else { 0.72 } };
    f32 b=if (design%3==0) { 0.43 } else { if (design%3==1) { 0.68 } else { 0.57 } };
    box(x-0.06,1.23,z+0.008,0.59,0.96,0.037,0.31,0.25,0.35);
    box(x,1.29,z,0.47,0.78,0.025,r,0.43,b);
    f32 shift=if (design%2==0) { 0.04 } else { 0.13 };
    box(x+shift,1.59,z-0.01,0.29,0.30,0.016,0.23,0.28,0.45);
    box(x+0.07,1.39,z-0.013,0.33,0.042,0.016,0.84,0.76,0.52);
};

unit(f32,f32,i32) video_windows = fn(x,z,i) {
    if (i<4) {
        f32 spacing=if (i>=2) { 0.51 } else { 0.0 };
        f32 shift=float_i(i)*0.70+spacing;
        video_card(x+0.96+shift,z,i);
        video_card(x+9.76+shift,z,i+2);
        video_windows(x,z,i+1);
    };
};

unit() render_world = fn {
    vertex_count=0;
    model_local=false;
    drawing_world=true;
    ground(-117.0,-21.0,152.0,96.0,-0.035,0.43,0.37,0.43);
    surface_paint=paint_canal;
    ground(-289.0,75.0,527.0,237.0,-0.035,0.12,0.26,0.36);
    surface_paint=0;
    district(0);
    draw_landmarks();
    draw_shop(-88.8,40.9);
    draw_harbor(0);
    promenade(0);
    draw_skyline(0);
    road_ground(4,0.018,0.26,0.29,0.37);
    ground(-5.7,-17.0,1.13,40.5,0.013,0.53,0.43,0.48);
    ground(4.57,-17.0,1.04,42.0,0.013,0.52,0.40,0.48);
    ground(-5.7,33.1,1.13,21.2,0.013,0.53,0.43,0.48);
    ground(4.57,33.1,1.04,21.2,0.013,0.52,0.40,0.48);
    ground(-5.7,62.3,1.13,10.7,0.013,0.53,0.43,0.48);
    ground(4.57,62.3,1.04,10.7,0.013,0.52,0.40,0.48);
    road_ground(5,0.018,0.31,0.33,0.43);
    road_ground(6,0.017,0.29,0.31,0.39);
    road_ground(7,0.017,0.31,0.33,0.39);
    ground(10.3,6.4,4.3,68.3,0.016,0.78,0.65,0.53);
    ground(-111.0,71.3,146.0,3.65,0.022,0.54,0.47,0.50);
    ground(7.0,74.92,8.0,11.4,0.023,0.52,0.37,0.39);
    road_ground(8,0.025,0.38,0.34,0.43);
    ground(6.85,124.55,8.38,6.10,0.12,0.57,0.42,0.41);
    box(3.56,0.0,-0.99,0.48,1.54,0.44,0.40,0.42,0.49);
    box(3.47,1.08,-1.09,0.66,0.60,0.40,0.27,0.46,0.54);
    box(3.53,1.25,-1.13,0.37,0.22,0.05,0.78,0.88,0.67);
    box(7.30,0.0,125.1,0.28,3.8,0.30,0.43,0.39,0.46);
    box(14.42,0.0,125.1,0.28,3.8,0.30,0.43,0.39,0.46);
    box(7.30,3.72,125.1,7.40,0.23,0.30,0.92,0.69,0.39);
    box(7.90,2.37,125.05,0.35,0.48,0.32,1.0,0.75,0.36);
    box(13.75,2.37,125.05,0.35,0.48,0.32,1.0,0.75,0.36);
    ground(-85.0,34.6,6.1,5.2,0.036,0.32,0.27,0.38);
    ground(-85.0,34.6,0.12,5.2,0.041,0.95,0.67,0.40);
    ground(-79.02,34.6,0.12,5.2,0.041,0.95,0.67,0.40);
    ground(-3.0,76.0,9.6,1.15,-0.02,0.31,0.58,0.72);
    ground(15.6,79.0,21.0,1.1,-0.02,0.31,0.58,0.72);
    ground(-34.0,83.2,24.0,0.8,-0.02,0.30,0.59,0.73);
    ground(-33.0,90.2,38.0,0.65,-0.02,0.28,0.53,0.69);
    draw_buildings(0);
    draw_palms(0);
    paint_road(0);
    crosswalk(0);
    ground(-110.52,12.25,13.55,12.90,0.021,0.30,0.31,0.39);
    ground(-110.29,13.00,0.17,9.35,0.032,0.96,0.68,0.41);
    ground(-107.3,13.35,6.1,0.16,0.032,0.96,0.68,0.41);
    ground(-103.75,15.1,1.30,0.25,0.036,0.99,0.76,0.48);
    ground(avenue_prep_x-2.65,shop_service_z-1.18,5.3,0.13,0.036,0.99,0.76,0.48);
    ground(avenue_prep_x-2.65,shop_service_z+1.05,5.3,0.13,0.036,0.99,0.76,0.48);
    ground(avenue_prep_x-0.98,shop_service_z-0.10,1.76,0.20,0.046,0.99,0.76,0.48);
    ground(avenue_prep_x+0.47,shop_service_z-0.33,0.40,0.66,0.046,0.99,0.76,0.48);
    ground(avenue_prep_x+0.87,shop_service_z-0.18,0.33,0.36,0.046,0.99,0.76,0.48);
    ground(-82.85,24.63,0.60,0.18,0.046,0.99,0.76,0.48);
    ground(-83.35,24.36,0.56,0.16,0.046,0.99,0.76,0.48);
    box(-84.05,0.02,24.72,0.15,1.84,0.15,0.41,0.48,0.49);
    box(-84.24,1.55,24.68,0.57,0.43,0.21,0.92,0.61,0.39);
    box(-84.15,1.67,24.66,0.29,0.06,0.25,0.30,0.28,0.42);
    box(-84.15,1.67,24.66,0.06,0.19,0.25,0.30,0.28,0.42);
    box(-84.15,1.80,24.66,0.31,0.06,0.25,0.30,0.28,0.42);
    ground(-12.25,24.78,5.5,2.48,0.043,0.41,0.41,0.44);
    ground(-12.25,25.00,5.5,0.13,0.048,0.96,0.68,0.41);
    ground(-12.25,27.08,5.5,0.13,0.048,0.96,0.68,0.41);
    ground(-10.05,27.30,0.80,3.00,0.047,0.67,0.75,0.59);
    ground(3.88,30.27,0.13,40.48,0.044,0.70,0.75,0.58);
    box(-12.12,0.02,28.03,0.14,1.69,0.14,0.37,0.44,0.49);
    box(-12.32,1.38,27.99,0.56,0.52,0.20,0.94,0.63,0.38);
    ground(-81.5,36.94,16.36,0.19,0.044,0.47,0.83,0.75);
    ground(-64.90,38.4,0.20,34.92,0.043,0.47,0.83,0.75);
    ground(-64.95,73.35,69.18,0.19,0.042,0.47,0.83,0.75);
    ground(-77.80,37.17,0.20,0.42,0.049,0.58,0.95,0.84);
    ground(-77.46,37.25,0.20,0.42,0.049,0.58,0.95,0.84);
    ground(-64.98,39.67,0.20,0.42,0.049,0.58,0.95,0.84);
    ground(-64.64,39.76,0.20,0.42,0.049,0.58,0.95,0.84);
    ground(-63.75,73.18,0.42,0.20,0.049,0.58,0.95,0.84);
    ground(-63.66,72.84,0.42,0.20,0.049,0.58,0.95,0.84);
    road_ground(9,0.019,0.27,0.30,0.37);
    ground(-63.10,backstreet_z+1.48,68.0,0.12,0.028,0.67,0.85,0.71);
    road_ground(10,0.021,0.27,0.30,0.37);
    ground(-103.85,shop_service_z-2.22,47.79,0.12,0.029,0.67,0.85,0.71);
    ground(-84.40,shop_service_z+2.15,5.6,0.38,0.026,0.46,0.69,0.62);
    box(backstreet_x-0.14,0.0,backstreet_z-1.69,0.25,1.88,0.25,0.37,0.62,0.59);
    box(backstreet_x-0.25,1.58,backstreet_z-1.74,0.54,0.25,0.33,0.88,0.95,0.68);
    box(-84.12,0.0,shop_service_z+1.38,0.23,1.65,0.21,0.37,0.61,0.57);
    box(-84.28,1.44,shop_service_z+1.37,0.52,0.22,0.30,0.9,0.91,0.61);
    ground(-108.48,27.1,0.16,28.0,0.034,0.55,0.85,0.72);
    ground(-105.8,58.2,98.3,0.16,0.038,0.62,0.86,0.70);
    ground(park_x-2.35,park_z-1.06,4.7,2.12,0.042,0.30,0.45,0.44);
    ground(park_x-2.35,park_z+0.95,4.7,0.12,0.048,0.91,0.87,0.61);
    ground(park_x-2.35,park_z-1.06,4.7,0.12,0.048,0.91,0.87,0.61);
    ground(-5.0,60.05,0.90,13.80,0.042,0.45,0.64,0.55);
    box(park_x-1.35,0.03,park_z+1.48,0.14,1.95,0.14,0.33,0.50,0.47);
    box(park_x-1.58,1.62,park_z+1.44,0.62,0.64,0.19,0.30,0.61,0.61);
    box(park_x-1.45,1.72,park_z+1.42,0.076,0.40,0.025,1.0,0.91,0.67);
    box(park_x-1.45,2.04,park_z+1.42,0.34,0.076,0.025,1.0,0.91,0.67);
    box(park_x-1.45,1.86,park_z+1.42,0.34,0.077,0.025,1.0,0.91,0.67);
    box(park_x-1.19,1.86,park_z+1.42,0.079,0.26,0.025,1.0,0.91,0.67);
    ground(-4.72,harbor_crosswalk_z-0.52,0.81,1.04,0.039,0.48,0.87,0.72);
    ground(4.02,harbor_crosswalk_z-0.52,4.60,1.04,0.039,0.48,0.87,0.72);
    box(8.50,0.0,harbor_crosswalk_z-0.56,0.21,1.40,0.21,0.36,0.63,0.62);
    box(8.47,1.18,harbor_crosswalk_z-0.59,0.27,0.22,0.27,0.83,0.98,0.66);
    box(7.01,0.1,61.3,0.34,0.95,0.34,0.97,0.65,0.34);
    box(9.0,0.1,61.3,0.34,0.95,0.34,0.97,0.65,0.34);
    box(11.0,0.1,61.3,0.34,0.95,0.34,0.97,0.65,0.34);
    box(13.0,0.1,61.3,0.34,0.95,0.34,0.97,0.65,0.34);
    box(6.8,0.0,75.8,0.16,0.65,9.7,0.82,0.75,0.63);
    box(15.0,0.0,75.8,0.16,0.65,9.7,0.82,0.75,0.63);
    box(9.25,1.6,8.35,12.0,0.22,2.18,0.90,0.37,0.49);
    box(11.2,3.5,8.77,10.0,0.27,0.16,0.98,0.44,0.65);
    box(11.2,3.1,8.77,10.0,0.14,0.16,0.23,0.86,0.81);
    box(12.4,4.0,8.77,0.3,2.6,0.16,0.90,0.43,0.62);
    box(20.9,4.0,8.77,0.3,2.6,0.16,0.90,0.43,0.62);
    box(12.4,6.55,8.77,8.8,0.26,0.16,0.90,0.43,0.62);
    box(12.7,4.25,8.85,8.2,2.20,0.12,0.15,0.20,0.31);
    quad(13.6,4.75,8.66,16.0,6.02,8.66,17.7,5.55,8.66,19.9,4.75,8.66,0.96,0.63,0.38);
    ground(-161.0,23.0,44.0,41.0,-0.035,0.43,0.37,0.43);
    draw_annex_roads(11);
    draw_annex_buildings(30);
    road_ground(annex_middle_road,0.020,0.26,0.30,0.37);
    dusk_lamp(-4.60,6.4,1.10);
    dusk_lamp(4.60,16.8,-1.10);
    dusk_lamp(-4.60,37.2,1.10);
    dusk_lamp(-4.60,64.5,1.10);
    dusk_lamp(-124.0,39.3,0.78);
    dusk_lamp(-139.0,46.1,-0.82);
    working_wharf();
    phone_corner();
    video_windows(-88.8,39.81,0);
    pier_signal_housing();
    unsafe { host.world(core.pointer_cast<*?u8>(&?scenery[0][0][0][0][0]),vertex_count*6); };
    world_ready=true;
};
bool(f32,f32,f32,i32) wall_hit = fn(x,z,r,i) {
    if (i>=36 || (i==30 && x-r> -115.0)) { false } else {
        u64 n=ix(i);
        f32 bx=buildings[n][0]; f32 bz=buildings[n][1];
        f32 px=clamp(x,bx,bx+buildings[n][2]);
        f32 pz=clamp(z,bz,bz+buildings[n][3]);
        if (sq(x-px)+sq(z-pz)<r*r) { true } else { wall_hit(x,z,r,i+1) }
    }
};

bool(f32,f32,f32,i32) palm_hit = fn(x,z,r,i) {
    if (i>=12) { false } else {
        u64 n=ix(i);
        if (sq(x-trees[n][0])+sq(z-trees[n][1])<sq(r+0.32)) { true } else { palm_hit(x,z,r,i+1) }
    }
};

bool(f32,f32,f32,i32) promenade_hit = fn(x,z,r,i) {
    if (i>=20 || z<67.8 || x>-6.0) { false } else {
        f32 px=-108.2+5.25*float_i(i);
        f32 pz=68.9+0.71*float_i(i%3);
        if (sq(x-px)+sq(z-pz)<sq(r+0.23)) { true } else { promenade_hit(x,z,r,i+2) }
    }
};

bool(f32,f32,f32) bollard_hit = fn(x,z,r) {
    if (abs_f(z-61.47)<r+0.22 && x>6.7-r && x<13.7+r) {
        sq(z-61.47)+sq(x-7.18)<sq(r+0.22) ||
        sq(z-61.47)+sq(x-9.17)<sq(r+0.22) ||
        sq(z-61.47)+sq(x-11.17)<sq(r+0.22) ||
        sq(z-61.47)+sq(x-13.17)<sq(r+0.22)
    } else {
        if (abs_f(z-harbor_bollard_z)<r+0.17 && abs_f(x)<4.0+r) {
            f32 z2=sq(z-harbor_bollard_z);
            f32 reach=sq(r+0.17);
            z2+sq(x+3.8)<reach || z2+sq(x+1.9)<reach || z2+sq(x)<reach ||
            z2+sq(x-1.9)<reach || z2+sq(x-3.8)<reach
        } else { false }
    }
};

bool(f32,f32,i32) inside_annex_gate = fn(z,r,i) {
    u64 row=ix(i);
    f32 lo=map_roads[row][1];
    z>=lo+r && z<=lo+map_roads[row][3]-r
};

bool(f32,f32,f32) annex_clear = fn(x,z,r) {
    stage==MissionStage::free_roam && x>= -161.0+r && z>=23.0+r && z<=64.0-r &&
        (x<= -117.0-r || inside_annex_gate(z,r,11) || inside_annex_gate(z,r,17) || inside_annex_gate(z,r,annex_middle_road))
};

i32(f32,f32,f32,bool) static_hit = fn(x,z,r,vehicle) {
    if ((x < -111.0+r && !annex_clear(x,z,r)) || x>31.0-r || z < -17.0+r || z>86.0-r || (z>74.9-r && (vehicle || x<7.1+r || x>14.9-r)) ||
        wall_hit(x,z,r,0) || bollard_hit(x,z,r)) { 5 } else {
        if (palm_hit(x,z,r,0) || promenade_hit(x,z,r,0)) { 2 } else { 0 }
    }
};

i32(f32,f32,f32,f32) car_hit = fn(x,z,s,c) {
    i32 nose=static_hit(x+1.0*s,z+1.0*c,0.91,true);
    if (nose!=0) { nose } else {
        i32 tail=static_hit(x-0.95*s,z-0.95*c,0.91,true);
        if (tail!=0) { tail } else { static_hit(x,z,0.91,true) }
    }
};

f32(f32,f32,f32,f32,f32,f32) body_distance_sq = fn(x,z,px,pz,s,c) {
    f32 dx=px-x; f32 dz=pz-z;
    f32 t=clamp(dx*s+dz*c,-1.05,1.05);
    sq(dx-t*s)+sq(dz-t*c)
};

unit(i32) ring = fn(kind) {
    if (collision_wait<=0.0 || kind!=collision_kind) {
        collision_kind=kind;
        collision_seq=collision_seq+1;
        collision_wait=0.22;
    };
};

unit(i32,f32,f32,f32) strike_mailboxes = fn(i,s,c,speed) {
    if (i<4) {
        u64 n=ix(i);
        if (mailbox[n][2] == 0.0 && body_distance_sq(car_x,car_z,mailbox[n][0],mailbox[n][1],s,c)<1.54) {
            if (speed>1.15) {
                mailbox[n][2]=0.001;
                mailbox[n][3]=min_f(speed*0.19,5.9);
                f32 drift=if (mailbox[n][0]>=car_x) { 0.23 } else { -0.23 };
                mailbox[n][0]=mailbox[n][0]+drift;
                vx=vx*0.91; vz=vz*0.91;
                ring(1);
            } else {
                vx=vx*0.75; vz=vz*0.75;
            };
        };
        strike_mailboxes(i+1,s,c,speed);
    };
};

unit(i32) animate_mail = fn(i) {
    if (i<4) {
        u64 n=ix(i);
        if (mailbox[n][2]>0.0) {
            mailbox[n][2]=min_f(1.51,mailbox[n][2]+dt_step*mailbox[n][3]);
            mailbox[n][3]=max_f(0.95,mailbox[n][3]*0.97);
            f32 direction=if (mailbox_home[n][0]>0.0) { 1.0 } else { -1.0 };
            mailbox[n][0]=mailbox[n][0]+direction*dt_step*max_f(0.0,mailbox[n][3]-1.03);
        };
        animate_mail(i+1);
    };
};

unit(i32,f32,f32,f32) strike_peds = fn(i,s,c,speed) {
    if (i<9) {
        u64 n=ix(i);
        if (peds[n].stun_seconds<=0.0 && body_distance_sq(car_x,car_z,peds[n].x,peds[n].z,s,c)<1.58 && speed>0.7) {
            peds[n].stun_seconds=1.65;
            peds[n].slide_x=0.15*vx;
            peds[n].slide_z=0.15*vz;
            if (speed>2.0) { vx=vx*0.78; vz=vz*0.78; }
            else { vx=vx*0.52; vz=vz*0.52; };
            ring(3);
        };
        strike_peds(i+1,s,c,speed);
    };
};

unit(i32) move_peds = fn(i) {
    if (i<9) {
        u64 n=ix(i);
        f32 dx=0.0;
        f32 dz=0.0;
        if (peds[n].stun_seconds>0.0) {
            peds[n].stun_seconds=max_f(0.0,peds[n].stun_seconds-dt_step);
            dx=peds[n].slide_x*dt_step; dz=peds[n].slide_z*dt_step;
            peds[n].slide_x=peds[n].slide_x*0.88; peds[n].slide_z=peds[n].slide_z*0.88;
        } else {
            i32 to=if (peds[n].toward_second_waypoint) { 2 } else { 0 };
            f32 gx=sidewalks[n][ix(to)]-peds[n].x;
            f32 gz=sidewalks[n][ix(to+1)]-peds[n].z;
            f32 gap=length(gx,gz);
            if (gap < 0.48) { peds[n].toward_second_waypoint=!peds[n].toward_second_waypoint; }
            else { dx=gx/gap*dt_step*1.45; dz=gz/gap*dt_step*1.45; };
            f32 ax=peds[n].x-car_x; f32 az=peds[n].z-car_z;
            f32 clearance=length(ax,az);
            f32 pace=length(vx,vz);
            if (in_car && clearance<6.9 && clearance>0.20 && pace>1.6 && ax*vx+az*vz>0.0) {
                f32 cross=ax*vz-az*vx;
                f32 side=if (cross>=0.0) { 1.0 } else { -1.0 };
                dx=dx+side*vz/pace*dt_step*2.6;
                dz=dz-side*vx/pace*dt_step*2.6;
            };
        };
        if (static_hit(peds[n].x+dx,peds[n].z,0.28,false)==0) { peds[n].x=peds[n].x+dx; };
        if (static_hit(peds[n].x,peds[n].z+dz,0.28,false)==0) { peds[n].z=peds[n].z+dz; };
        peds[n].gait_phase=peds[n].gait_phase+length(dx,dz)*3.15;
        if (peds[n].gait_phase>6.2831853) { peds[n].gait_phase=peds[n].gait_phase-6.2831853; };
        move_peds(i+1);
    };
};

bool(f32,f32,i32) crossing = fn(z,dir,i) {
    if (i>=9) { false } else {
        u64 n=ix(i);
        f32 ahead=(peds[n].z-z)*dir;
        if (ahead>0.9 && ahead<5.8 && abs_f(peds[n].x)<3.8) { true } else { crossing(z,dir,i+1) }
    }
};

bool(f32,f32,f32,i32,i32) queue_ahead = fn(side,along,dir,i,skip) {
    if (i>=6) { false } else {
        u64 n=ix(i);
        f32 d=traffic[n].signed_lane_direction;
        bool west=abs_f(dir)>1.5;
        f32 lane=if (west) { traffic[n].z } else { traffic[n].x };
        f32 travel=if (west) { traffic[n].x } else { traffic[n].z };
        f32 ahead=(travel-along)*dir;
        if (i!=skip && d==dir && ahead>0.0 && ahead<abs_f(dir)*6.4 && abs_f(lane-side)<1.32) { true }
        else { queue_ahead(side,along,dir,i+1,skip) }
    }
};

f32(f32,f32,f32,f32) vehicle_overlap = fn(dx,dz,s,c) {
    f32 rs=abs_f(s); f32 rc=abs_f(c);
    f32 half_w=0.94+0.94*rc+1.94*rs;
    f32 half_l=1.94+0.94*rs+1.94*rc;
    f32 cross_x=half_w-abs_f(dx); f32 cross_z=half_l-abs_f(dz);
    f32 qx=dx*c-dz*s; f32 qz=dx*s+dz*c;
    f32 car_x_axis=half_w-abs_f(qx); f32 car_z_axis=half_l-abs_f(qz);
    f32 depth=min_f(min_f(cross_x,cross_z),min_f(car_x_axis,car_z_axis));
    if (depth>=0.0) {
        if (depth==cross_x) {
            contact_x=if (dx>=0.0) { 1.0 } else { -1.0 }; contact_z=0.0;
        } else {
            if (depth==cross_z) {
                contact_x=0.0; contact_z=if (dz>=0.0) { 1.0 } else { -1.0 };
            } else {
                if (depth==car_x_axis) {
                    f32 k=if (qx>=0.0) { 1.0 } else { -1.0 };
                    contact_x=k*c; contact_z=-k*s;
                } else {
                    f32 k=if (qz>=0.0) { 1.0 } else { -1.0 };
                    contact_x=k*s; contact_z=k*c;
                };
            };
        };
    };
    depth
};

bool(f32,f32,f32,f32,f32) slab_clear = fn(pos,vel,extent,ax,az) {
    if (abs_f(vel)<0.000001) { abs_f(pos)>extent } else {
        f32 first=(-extent-pos)/vel; f32 last=(extent-pos)/vel;
        f32 near=min_f(first,last);
        if (near>=enter_time) {
            enter_time=near;
            f32 sign=if (vel<0.0) { 1.0 } else { -1.0 };
            contact_x=ax*sign; contact_z=az*sign;
        };
        exit_time=min_f(exit_time,max_f(first,last));
        enter_time>exit_time
    }
};

f32(f32,f32,f32,f32,f32,f32,bool) vehicle_sweep = fn(dx,dz,step_x,step_z,ps,pc,west) {
    f32 x=if (west) { -dz } else { dx };
    f32 z=if (west) { dx } else { dz };
    f32 vx_sweep=if (west) { -step_z } else { step_x };
    f32 vz_sweep=if (west) { step_x } else { step_z };
    f32 s=if (west) { -pc } else { ps };
    f32 c=if (west) { ps } else { pc };
    f32 half_w=0.94+0.94*abs_f(c)+1.94*abs_f(s);
    f32 half_l=1.94+0.94*abs_f(s)+1.94*abs_f(c);
    f32 depth=vehicle_overlap(x,z,s,c);
    enter_time=0.0; exit_time=1.0;
    bool hit=false;
    if (depth>=0.0) {
        f32 normal_step=vx_sweep*contact_x+vz_sweep*contact_z;
        if (normal_step<depth) { hit=true; };
    } else {
        hit=!slab_clear(x,vx_sweep,half_w,1.0,0.0) && !slab_clear(z,vz_sweep,half_l,0.0,1.0) &&
            !slab_clear(x*c-z*s,vx_sweep*c-vz_sweep*s,half_w,c,-s) &&
            !slab_clear(x*s+z*c,vx_sweep*s+vz_sweep*c,half_l,s,c);
    };
    if (hit && west) {
        f32 old=contact_x;
        contact_x=contact_z; contact_z=-old;
    };
    if (hit) { enter_time } else { 2.0 }
};

i32(f32,f32,f32,f32,f32,f32,i32,i32) select_traffic = fn(x,z,dx,dz,s,c,i,best) {
    if (i>=6) { best } else {
        u64 n=ix(i);
        f32 rx=x-traffic[n].x; f32 rz=z-traffic[n].z;
        if (abs_f(rx)<4.65 && abs_f(rz)<4.65) {
            f32 bx=contact_x; f32 bz=contact_z;
            f32 t=vehicle_sweep(rx,rz,dx,dz,s,c,abs_f(traffic[n].signed_lane_direction)>1.5);
            if (t<traffic_time) {
                traffic_time=t;
                select_traffic(x,z,dx,dz,s,c,i+1,i)
            } else {
                contact_x=bx; contact_z=bz;
                select_traffic(x,z,dx,dz,s,c,i+1,best)
            }
        } else { select_traffic(x,z,dx,dz,s,c,i+1,best) }
    }
};

i32(f32,f32,f32,f32,f32,f32) traffic_hit = fn(x,z,dx,dz,s,c) {
    traffic_time=1.00001;
    select_traffic(x,z,dx,dz,s,c,0,-1)
};

unit(i32) move_traffic = fn(i) {
    if (i<6) {
        u64 n=ix(i);
        f32 x=traffic[n].x; f32 z=traffic[n].z; f32 direction=traffic[n].signed_lane_direction;
        bool west=abs_f(direction)>1.5;
        f32 sign=if (direction>0.0) { 1.0 } else { -1.0 };
        f32 along=if (west) { x } else { z };
        f32 side=if (west) { z } else { x };
        f32 pcross=if (west) { car_z-side } else { car_x-side };
        f32 fcross=if (west) { foot_z-side } else { foot_x-side };
        f32 pd=(if (west) { car_x-along } else { car_z-along })*sign;
        f32 fd=(if (west) { foot_x-along } else { foot_z-along })*sign;
        bool blocked = (abs_f(pcross)<2.25 && pd>0.0 && pd<6.5) ||
            (!in_car && abs_f(fcross)<1.45 && fd>0.0 && fd<5.7) ||
            (!west && crossing(z,sign,0)) || queue_ahead(side,along,direction,0,i);
        f32 target=if (blocked) { 0.0 } else { 7.0+float_i(i%2) };
        traffic[n].speed=traffic[n].speed+clamp(target-traffic[n].speed,-dt_vehicle*9.0,dt_vehicle*3.9);
        f32 displacement=sign*traffic[n].speed*dt_vehicle;
        f32 next=along+displacement;
        f32 lo=if (west) { -108.0 } else { -13.0 };
        f32 hi=if (west) { -35.0 } else { harbor_traffic_end };
        if (next>hi || next<lo) {
            f32 lane=if (west) { if (sign>0.0) { 31.02 } else { 27.05 } } else { if (sign>0.0) { -2.0 } else { 2.0 } };
            if ((abs_f(pd)>7.0 || abs_f(pcross)>4.0) &&
                (abs_f(pd)>7.0 || abs_f(pcross+side-lane)>4.0) &&
                !queue_ahead(lane,next,-direction,0,i)) {
                if (west) { traffic[n].z=lane; } else { traffic[n].x=lane; };
                traffic[n].signed_lane_direction=-direction;
                traffic[n].speed=2.5;
            } else {
                traffic[n].speed=0.0;
            };
        } else {
            f32 dx=if (west) { displacement } else { 0.0 };
            f32 dz=if (west) { 0.0 } else { displacement };
            f32 rx=car_x-x; f32 rz=car_z-z;
            f32 ps=sin_small(car_yaw); f32 pc=cos_small(car_yaw);
            f32 hit=if (abs_f(rx)<4.65 && abs_f(rz)<4.65) { vehicle_sweep(rx,rz,-dx,-dz,ps,pc,west) } else { 2.0 };
            if (hit<=1.0) {
                f32 normal_x=contact_x; f32 normal_z=contact_z;
                f32 closing=(if (west) { sign*normal_x } else { sign*normal_z })*traffic[n].speed;
                if (closing>0.0) {
                    f32 fraction=max_f(0.0,hit-0.002);
                    traffic[n].x=x+dx*fraction; traffic[n].z=z+dz*fraction;
                    f32 momentum=if (closing>0.68) { min_f(0.86,closing*0.24) } else { 0.0 };
                    f32 ax=car_x+normal_x*momentum*dt_vehicle;
                    f32 az=car_z+normal_z*momentum*dt_vehicle;
                    if (car_hit(ax,az,ps,pc)==0 && traffic_hit(car_x,car_z,ax-car_x,az-car_z,ps,pc)<0) {
                        car_x=ax; car_z=az;
                        if (in_car) {
                            vx=vx+normal_x*momentum; vz=vz+normal_z*momentum;
                            car_roll=car_roll+normal_x*momentum*0.022;
                        };
                    };
                    if (closing>1.4) { ring(4); };
                };
                traffic[n].speed=0.0;
            } else {
                traffic[n].x=x+dx; traffic[n].z=z+dz;
            };
        };
        move_traffic(i+1);
    };
};

bool(f32,f32,f32,f32,f32,f32) can_slide = fn(dx,dz,s,c,ns,nc) {
    car_hit(car_x+dx,car_z+dz,ns,nc)==0 &&
    car_hit(car_x+dx*0.5,car_z+dz*0.5,(s+ns)*0.5,(c+nc)*0.5)==0 &&
    traffic_hit(car_x,car_z,dx,dz,ns,nc)<0
};

unit(f32,f32,f32,f32,f32,f32,f32,i32) slide_building = fn(dx,dz,yaw,s,c,ns,nc,hit) {
    if (yaw!=car_yaw && can_slide(dx,dz,s,c,s,c)) {
        car_x=car_x+dx; car_z=car_z+dz;
    } else {
        bool clear_x=abs_f(dx)>0.00001 && can_slide(dx,0.0,s,c,ns,nc);
        bool clear_z=abs_f(dz)>0.00001 && can_slide(0.0,dz,s,c,ns,nc);
        bool turned=clear_x || clear_z;
        if (!turned && yaw!=car_yaw) {
            clear_x=abs_f(dx)>0.00001 && can_slide(dx,0.0,s,c,s,c);
            clear_z=abs_f(dz)>0.00001 && can_slide(0.0,dz,s,c,s,c);
        };
        f32 blocked=0.0;
        if (clear_x && (!clear_z || abs_f(dx)>=abs_f(dz))) {
            car_x=car_x+dx;
            vx=vx*0.985; blocked=abs_f(vz); vz=0.0;
        } else {
            if (clear_z) { car_z=car_z+dz; vz=vz*0.985; blocked=abs_f(vx); vx=0.0; }
            else {
                blocked=length(vx,vz); vx=0.0; vz=0.0;
            };
        };
        if (turned) { car_yaw=yaw; };
        if (blocked>1.15) { ring(hit); };
    };
};

unit(f32,f32,f32,f32,i32) move_vehicle = fn(steer,drive,s,c,brake) {
    f32 ahead=vx*s+vz*c;
    f32 sideways=vx*c-vz*s;
    f32 power=if (drive>=0.0) { drive*8.7 } else {
        if (ahead>0.5) { drive*13.5 } else { drive*4.8 }
    };
    f32 drag=if (brake!=0) { 4.25 } else { 0.35+0.026*abs_f(ahead) };
    f32 next_speed=clamp(ahead+(power-ahead*drag)*dt_vehicle,-7.2,21.0);
    f32 yaw_speed=if (brake!=0) { 2.2 } else { 1.41 };
    f32 reverse=if (next_speed<0.0) { -1.0 } else { 1.0 };
    f32 change=steer*clamp(abs_f(next_speed)*0.19,0.0,1.0)*yaw_speed*reverse*dt_vehicle;
    f32 yaw=wrap(car_yaw+change);
    f32 ns=sin_small(yaw); f32 nc=cos_small(yaw);
    f32 grip=if (brake!=0) { 3.0 } else { 8.45 };
    f32 slip=(sideways-next_speed*change)*(1.0-dt_vehicle*grip);
    vx=ns*next_speed+nc*slip;
    vz=nc*next_speed-ns*slip;
    if (abs_f(drive)<0.0001 && abs_f(next_speed)<0.035 && abs_f(slip)<0.035) { vx=0.0; vz=0.0; };
    f32 dx=vx*dt_vehicle; f32 dz=vz*dt_vehicle;
    f32 nx=car_x+dx; f32 nz=car_z+dz;
    i32 hit=car_hit(nx,nz,ns,nc);
    i32 other=if (hit==0) { traffic_hit(car_x,car_z,dx,dz,ns,nc) } else { -1 };
    f32 impact=length(vx,vz);
    if (hit==0 && other<0) {
        car_x=nx; car_z=nz; car_yaw=yaw;
    } else {
        if (other>=0) {
            f32 nx_contact=contact_x; f32 nz_contact=contact_z;
            f32 t=traffic_time;
            f32 direction=traffic[ix(other)].signed_lane_direction;
            f32 pace=traffic[ix(other)].speed;
            f32 obstacle_speed=if (direction>0.0) { pace } else { -pace };
            f32 facing=if (abs_f(direction)>1.5) { nx_contact } else { nz_contact };
            f32 into=vx*nx_contact+vz*nz_contact;
            f32 relative=into-obstacle_speed*facing;
            if (relative < -1.2) { ring(4); };
            traffic[ix(other)].speed=min_f(traffic[ix(other)].speed,max_f(0.0,traffic[ix(other)].speed+relative*0.45));
            if (into<0.0) {
                vx=vx-nx_contact*into*1.08;
                vz=vz-nz_contact*into*1.08;
            };
            f32 advance_fraction=max_f(0.0,t-0.004);
            f32 close_x=car_x+dx*advance_fraction;
            f32 close_z=car_z+dz*advance_fraction;
            if (car_hit(close_x,close_z,s,c)==0 && traffic_hit(car_x,car_z,close_x-car_x,close_z-car_z,s,c)<0) {
                car_x=close_x; car_z=close_z;
            };
            f32 slide_dx=vx*dt_vehicle*(1.0-advance_fraction);
            f32 slide_dz=vz*dt_vehicle*(1.0-advance_fraction);
            f32 slide_x=car_x+slide_dx; f32 slide_z=car_z+slide_dz;
            if (car_hit(slide_x,slide_z,s,c)==0 && traffic_hit(car_x,car_z,slide_dx,slide_dz,s,c)<0) {
                car_x=slide_x; car_z=slide_z;
            } else {
                vx=vx*0.3; vz=vz*0.3;
            };
        } else {
            if (hit==5) { slide_building(dx,dz,yaw,s,c,ns,nc,hit); }
            else {
                bool pass_x=car_hit(nx,car_z,s,c)==0 && traffic_hit(car_x,car_z,dx,0.0,s,c)<0;
                bool pass_z=car_hit(car_x,nz,s,c)==0 && traffic_hit(car_x,car_z,0.0,dz,s,c)<0;
                if (pass_x && (!pass_z || abs_f(dx)>=abs_f(dz))) {
                    car_x=nx; vx=vx*0.64; vz=vz*(-0.17);
                } else {
                    if (pass_z) { car_z=nz; vx=vx*(-0.17); vz=vz*0.64; }
                    else { vx=vx*(-0.16); vz=vz*(-0.16); };
                };
                if (impact>0.92) { ring(hit); };
            };
        };
    };
    f32 hs=sin_small(car_yaw); f32 hc=cos_small(car_yaw);
    strike_mailboxes(0,hs,hc,impact);
    strike_peds(0,hs,hc,impact);
    car_roll=blend(car_roll,clamp((vx*hc-vz*hs)*0.039,-0.18,0.18),0.20);
    brake_mark=if (brake>0 || drive< -0.45) { 1.0 } else { 0.0 };
};

bool(f32,f32,i32) foot_traffic_hit = fn(x,z,i) {
    if (i>=6) { false } else {
        u64 n=ix(i);
        bool west=abs_f(traffic[n].signed_lane_direction)>1.5;
        f32 s=if (west) { 1.0 } else { 0.0 };
        f32 c=if (west) { 0.0 } else { 1.0 };
        if (body_distance_sq(traffic[n].x,traffic[n].z,x,z,s,c)<1.46) { true }
        else { foot_traffic_hit(x,z,i+1) }
    }
};

bool(f32,f32) on_foot_clear = fn(x,z) {
    static_hit(x,z,0.31,false)==0 &&
    body_distance_sq(car_x,car_z,x,z,sin_small(car_yaw),cos_small(car_yaw))>1.38 &&
    !foot_traffic_hit(x,z,0)
};

unit(f32,f32,i32) walk = fn(strafe,drive,fast) {
    f32 axes=length(strafe,drive);
    f32 pace=if (fast!=0) { 6.1 } else { 3.85 };
    foot_speed=clamp(axes,0.0,1.0)*pace;
    if (axes>0.02) {
        f32 x=foot_x+dt_step*foot_speed*strafe/axes;
        f32 z=foot_z+dt_step*foot_speed*drive/axes;
        if (on_foot_clear(x,foot_z)) { foot_x=x; };
        if (on_foot_clear(foot_x,z)) { foot_z=z; };
        if (abs_f(strafe)>abs_f(drive)) { foot_yaw=if (strafe>0.0) { 1.57079633 } else { -1.57079633 }; }
        else { foot_yaw=if (drive>0.0) { 0.0 } else { 3.14159265 }; };
    };
};

f32() player_x = fn { if (in_car) { car_x } else { foot_x } };
f32() player_z = fn { if (in_car) { car_z } else { foot_z } };
bool() follows_backstreet = fn { in_car && bypass };
bool() follows_return = fn { in_car && bypass && pickup_leg==3 };
unit() advance_car_route = fn {
    if (in_car && bypass) {
        if (stage==MissionStage::pickup_tape) {
            if (pickup_leg==0 && car_z>3.0) { bypass=false; }
            else {
                u64 leg=ix(pickup_leg);
                if (pickup_leg<3 && sq(car_x-pickup_route[leg][0])+sq(car_z-pickup_route[leg][1])<sq(pickup_route[leg][2])) {
                    pickup_leg=pickup_leg+1;
                };
            };
        };
        if (stage==MissionStage::reach_pier && pickup_leg==3 && return_leg<6) {
            u64 leg=ix(return_leg);
            if (sq(car_x-return_route[leg][0])+sq(car_z-return_route[leg][1])<sq(return_route[leg][2])) {
                return_leg=return_leg+1;
            };
        };
    };
};
f32() tape_guide_x = fn { if (follows_backstreet()) { pickup_route[ix(pickup_leg)][0] } else { tape_x } };
f32() tape_guide_z = fn { if (follows_backstreet()) { pickup_route[ix(pickup_leg)][1] } else { tape_z } };
bool() at_park_handoff = fn {
    stage==MissionStage::reach_pier && return_leg==6 && follows_return() && car_x>park_x-1.6 && car_x< -5.35 && abs_f(car_z-park_z)<1.0
};
bool() uses_park_exit = fn { !in_car && park_walk && foot_z<61.9 && foot_x< -4.3 };
bool() uses_harbor_walk = fn { !in_car && foot_z>61.4 && foot_x<7.85 };
i32() harbor_walk_leg = fn {
    if (uses_park_exit()) { 0 }
    else { if (uses_harbor_walk()) { if (foot_x<3.45 && foot_z<harbor_crosswalk_z-0.40) { 1 } else { 2 } } else { -1 } }
};
f32(i32,i32) harbor_walk_point = fn(row,column) {
    if (column==0) { if (row<2) { -4.55 } else { 8.10 } }
    else { if (row==0) { 62.10 } else { harbor_crosswalk_z } }
};
bool() at_pier_approach = fn {
    !in_car && foot_x>=7.85 && foot_x<=14.35 && foot_z>=harbor_crosswalk_z-0.4
};
unit() advance_waterfront = fn {
    if (stage==MissionStage::reach_pier && !in_car && waterfront_leg>=0) {
        bool left_path=if (waterfront_leg==0) { foot_x< -84.6 || foot_z<34.4 || foot_z>40.5 }
        else {
            if (waterfront_leg==1) { foot_x< -67.0 || foot_x> -62.6 || foot_z<36.6 }
            else { foot_z<72.1 }
        };
        if (left_path) { waterfront_leg=-1; }
        else {
            u64 leg=ix(waterfront_leg);
            if (sq(foot_x-waterfront_route[leg][0])+sq(foot_z-waterfront_route[leg][1])<0.36) {
                waterfront_leg=if (waterfront_leg==2) { -1 } else { waterfront_leg+1 };
            };
        };
    };
};
bool() at_avenue_handoff = fn {
    stage==MissionStage::reach_pier && in_car && avenue_leg==9 && abs_f(car_x+9.5)<1.55 && abs_f(car_z-26.0)<0.95
};
unit() advance_avenue = fn {
    if (stage==MissionStage::reach_pier && avenue_leg>=0) {
        if (in_car) {
            if (avenue_leg<6 && car_x> -73.0) { avenue_leg=-1; }
            else {
                if (avenue_leg<9) {
                    u64 leg=ix(avenue_leg);
                    bool in_slot=sq(car_x-avenue_route[leg][0])+sq(car_z-avenue_route[leg][1])<sq(avenue_route[leg][2]);
                    if (in_slot && (avenue_leg!=5 || car_z>21.6)) { avenue_leg=avenue_leg+1; };
                };
            };
        } else {
            if (foot_x< -87.0 || foot_x> -77.0 || foot_z<19.8 || foot_z>28.9) { avenue_leg=-1; };
        };
    };
    if (stage==MissionStage::reach_pier && !in_car && avenue_walk_leg>=0) {
        u64 leg=ix(avenue_walk_leg);
        if (sq(foot_x-avenue_foot[leg][0])+sq(foot_z-avenue_foot[leg][1])<0.36) {
            avenue_walk_leg=if (avenue_walk_leg==3) { -1 } else { avenue_walk_leg+1 };
        };
    };
};
f32() pier_guide_x = fn {
    if (avenue_leg>=0) { if (in_car) { avenue_route[ix(avenue_leg)][0] } else { car_x } }
    else { if (avenue_walk_leg>=0) { avenue_foot[ix(avenue_walk_leg)][0] }
    else { if (waterfront_leg>=0) { waterfront_route[ix(waterfront_leg)][0] }
    else {
        i32 harbor_leg=harbor_walk_leg();
        if (harbor_leg>=0) { harbor_walk_point(harbor_leg,0) }
        else { if (follows_return()) { return_route[ix(return_leg)][0] } else { dock_x } }
    } } }
};
f32() pier_guide_z = fn {
    if (avenue_leg>=0) { if (in_car) { avenue_route[ix(avenue_leg)][1] } else { car_z } }
    else { if (avenue_walk_leg>=0) { avenue_foot[ix(avenue_walk_leg)][1] }
    else { if (waterfront_leg>=0) { waterfront_route[ix(waterfront_leg)][1] }
    else {
        if (uses_park_exit()) { harbor_walk_point(0,1) }
        else { if (uses_harbor_walk()) { harbor_crosswalk_z }
        else { if (follows_return()) { return_route[ix(return_leg)][1] } else { dock_z } } }
    } } }
};

i32() pickup_foot_leg = fn {
    f32 edge=0.85;
    if (abs_f(foot_x-pickup_foot[2][0])<=edge &&
        foot_z>=pickup_foot[2][1]-edge && foot_z<=tape_z+edge) { 3 }
    else {
        if (abs_f(foot_z-pickup_foot[1][1])<=edge &&
            foot_x>=pickup_foot[2][0]-edge && foot_x<=pickup_foot[1][0]+edge) { 2 }
        else {
            if (abs_f(foot_x-pickup_foot[0][0])<=edge &&
                foot_z>=pickup_foot[0][1]-edge && foot_z<=pickup_foot[1][1]+edge) { 1 } else { 0 }
        }
    }
};

i32() route_selection = fn {
    if (stage==MissionStage::pickup_tape) {
        if (follows_backstreet()) { 16+pickup_leg }
        else {
            if (in_car) { 0 }
            else {
                i32 foot_leg=pickup_foot_leg();
                if (foot_leg>0) { 112+foot_leg } else { 0 }
            }
        }
    } else {
        if (stage!=MissionStage::reach_pier) { 0 }
        else {
            if (avenue_leg>=0 && in_car) { 32+avenue_leg }
            else {
                if (avenue_walk_leg>=0) { 48+avenue_walk_leg }
                else {
                    if (waterfront_leg>=0) { 64+waterfront_leg }
                    else {
                        if (follows_return() && !park_walk && avenue_leg<0) { 80+return_leg }
                        else {
                            i32 harbor_leg=harbor_walk_leg();
                            if (harbor_leg>=0 && avenue_leg<0) { 96+harbor_leg }
                            else { if (at_pier_approach() && avenue_leg<0) { 99 } else { 0 } }
                        }
                    }
                }
            }
        }
    }
};

f32(i32,i32,i32) route_value = fn(key,row,column) {
    i32 route=key/16;
    i32 leg=key%16;
    i32 start=if (leg>0) { leg-1 } else { 0 };
    i32 route_count=if (route==1) { 4 }
    else { if (route==2) { 10 }
    else { if (route==3) { 5 }
    else { if (route==4) { 4 }
    else { if (route==5) { 7 } else { if (route==6 || route==7) { 4 } else { 0 } } } } } };
    if (key<=0 || leg>=route_count) { 0.0 }
    else {
        if (row==-1 && column==0) { float_i(route_count-start) }
        else {
            if (row<0 || row>=route_count-start || column<0 || column>1) { 0.0 }
            else {
                i32 point=start+row;
                u64 n=ix(point); u64 c=ix(column);
                if (route==7) {
                    if (point<3) { pickup_foot[n][c] } else { if (column==0) { tape_x } else { tape_z } }
                } else {
                    if ((route==3 || route==4 || route==6) && point==route_count-1) {
                        if (column==0) { dock_x } else { dock_z }
                    } else {
                        if (route==1) { pickup_route[n][c] }
                        else { if (route==2) { avenue_route[n][c] }
                        else { if (route==3) { avenue_foot[n][c] }
                        else { if (route==4) { waterfront_route[n][c] }
                        else { if (route==5) { return_route[n][c] } else { harbor_walk_point(point,column) } } } } }
                    }
                }
            }
        }
    }
};

bool() avenue_prepared = fn {
    abs_f(car_x-avenue_prep_x)<0.85 && abs_f(car_z-shop_service_z)<0.40 &&
        sin_small(car_yaw)>0.994 && abs_f(cos_small(car_yaw))<0.10 && sq(vx)+sq(vz)<0.04
};
i32() cue = fn {
    if (stage==MissionStage::docked) { 5 } else {
        if (stage==MissionStage::delivered || stage==MissionStage::missed_departure || stage==MissionStage::crossing || stage==MissionStage::disembarking) { 0 } else {
            if (!in_car && stage==MissionStage::answer_phone && sq(foot_x-phone_x)+sq(foot_z-phone_z)<3.24) { 6 }
            else {
                if (!in_car && stage==MissionStage::pickup_tape && sq(foot_x-tape_x)+sq(foot_z-tape_z)<5.29) { 3 }
                else {
                    if (!in_car && stage==MissionStage::reach_pier && sq(foot_x-dock_x)+sq(foot_z-dock_z)<5.29) { 4 }
                    else {
                        if (!in_car && stage==MissionStage::reach_pier && waterfront_leg<0 && sq(foot_x-tape_x)+sq(foot_z-tape_z)<4.0) { 8 }
                        else {
                            if (!in_car && stage==MissionStage::reach_pier && avenue_leg<0 && sq(foot_x+83.2)+sq(foot_z-24.75)<1.44 &&
                                ((abs_f(car_x+82.0)<2.8 && abs_f(car_z-shop_service_z)<1.9 && sin_small(car_yaw)< -0.77) || avenue_prepared())) { 9 }
                            else { if (in_car) { if (length(vx,vz)<2.9) { if (at_park_handoff() || at_avenue_handoff()) { 7 } else { 2 } } else { 0 } }
                        else { if (sq(foot_x-car_x)+sq(foot_z-car_z)<10.24) { 1 } else { 0 } } } }
                    }
                }
            }
        }
    }
};
unit() interact = fn {
    i32 what=cue();
    if (what==9) { avenue_leg=if (avenue_prepared()) { 6 } else { 0 }; waterfront_leg=-1; }
    else { if (what==8) { waterfront_leg=0; avenue_leg=-1; }
    else { if (what==1) { in_car=true; park_walk=false; waterfront_leg=-1; avenue_walk_leg=-1; }
    else {
        if (what==2 || what==7) {
            bool avenue_exit=what==7 && at_avenue_handoff();
            f32 c=cos_small(car_yaw); f32 s=sin_small(car_yaw);
            f32 door=if (what==7 && s>0.0) { -1.6 } else { 1.6 };
            f32 ax=car_x+c*door; f32 az=car_z-s*door;
            f32 bx=car_x-c*door; f32 bz=car_z+s*door;
            if (on_foot_clear(ax,az)) { foot_x=ax; foot_z=az; in_car=false; }
            else {
                if (on_foot_clear(bx,bz)) { foot_x=bx; foot_z=bz; in_car=false; };
            };
            if (!in_car) {
                vx=0.0; vz=0.0; foot_speed=0.0; foot_yaw=car_yaw;
                park_walk=what==7 && !avenue_exit;
                avenue_walk_leg=if (avenue_exit) { 0 } else { -1 };
                avenue_leg=-1;
            };
        } else {
            if (what==3) { stage=MissionStage::reach_pier; }
            else {
                if (what==4) {
                    stage=MissionStage::crossing;
                    board_time=0.0; board_x=foot_x; board_z=foot_z;
                    foot_speed=0.0; foot_yaw=0.0;
                } else {
                    if (what==5) { stage=MissionStage::disembarking; board_time=0.0; board_x=foot_x; board_z=foot_z; }
                    else { if (what==6) { stage=MissionStage::pickup_tape; }; };
                };
            };
        };
    }; }; };
};

f32(f32,f32,f32,f32,f32,i32) clear_boom = fn(x,z,dx,dz,limit,i) {
    if (i>=36 || limit<=0.75 || (i==30 && x-limit> -114.7)) { limit } else {
        u64 n=ix(i);
        f32 bx=buildings[n][0]-0.30; f32 ex=bx+buildings[n][2]+0.60;
        f32 bz=buildings[n][1]-0.30; f32 ez=bz+buildings[n][3]+0.60;
        bool axis_x=abs_f(dx)<0.0001;
        bool axis_z=abs_f(dz)<0.0001;
        if ((axis_x && (x<bx || x>ex)) || (axis_z && (z<bz || z>ez))) {
            clear_boom(x,z,dx,dz,limit,i+1)
        } else {
            f32 near_x=if (axis_x) { -21.0 } else { min_f((bx-x)/dx,(ex-x)/dx) };
            f32 far_x=if (axis_x) { 21.0 } else { max_f((bx-x)/dx,(ex-x)/dx) };
            f32 near_z=if (axis_z) { -21.0 } else { min_f((bz-z)/dz,(ez-z)/dz) };
            f32 far_z=if (axis_z) { 21.0 } else { max_f((bz-z)/dz,(ez-z)/dz) };
            f32 near=max_f(0.0,max_f(near_x,near_z));
            f32 far=min_f(limit,min_f(far_x,far_z));
            f32 clear=if (near<=far) { max_f(0.72,near-0.20) } else { limit };
            clear_boom(x,z,dx,dz,clear,i+1)
        }
    }
};

unit() camera_step = fn {
    f32 aim=if (in_car) { car_yaw } else { 0.0 };
    camera_yaw=wrap(camera_yaw+wrap(aim-camera_yaw)*0.15);
    f32 hx=sin_small(camera_yaw); f32 hz=cos_small(camera_yaw);
    f32 sx=player_x(); f32 sz=player_z();
    camera_width=blend(camera_width,if (wide_camera) { 1.0 } else { 0.0 },0.14);
    f32 goal=if (in_car) { blend(8.4,12.0,camera_width) } else { blend(7.0,10.5,camera_width) };
    f32 dist=clear_boom(sx,sz,-hx,-hz,goal,0);
    camera_x=sx-dist*hx;
    camera_z=sz-dist*hz;
    f32 camera_deck=if (stage==MissionStage::crossing || stage==MissionStage::docked || stage==MissionStage::disembarking || stage==MissionStage::delivered) { board_height } else { 0.0 };
    f32 camera_base=if (dist<3.8) { 2.35 } else { blend(if (in_car) { 4.2 } else { 3.9 },6.1,camera_width) };
    f32 aim_pitch=if (dist<3.8) { -0.48 } else { blend(if (in_car) { -0.29 } else { -0.25 },-0.35,camera_width) };
    f32 eye_y=camera_deck+camera_base;
    if (!in_car && sx>pier_marquee_x && sx<pier_marquee_x+pier_marquee_width &&
        sz>pier_marquee_z-1.45 && camera_z<pier_marquee_z+1.15) {
        f32 enters=clamp((sz-(pier_marquee_z-1.45))/0.85,0.0,1.0);
        f32 clears=clamp(((pier_marquee_z+1.15)-camera_z)/0.62,0.0,1.0);
        f32 underpass=min_f(enters,clears);
        eye_y=blend(eye_y,min_f(eye_y,pier_marquee_floor-0.64),underpass);
        if (dist>=3.8) { aim_pitch=blend(aim_pitch,-0.18,underpass*camera_width); };
    };
    camera_y=blend(camera_y,eye_y,0.38);
    camera_pitch=blend(camera_pitch,aim_pitch,0.22);
};

unit(i32) snapshot_traffic = fn(i) {
    if (i<6) {
        u64 n=ix(i);
        previous_traffic[n][0]=traffic[n].x; previous_traffic[n][1]=traffic[n].z;
        snapshot_traffic(i+1);
    };
};

unit() snapshot = fn {
    snapshot_traffic(0);
    old_ferry_z=ferry_z; old_board_height=board_height;
    old_x=car_x; old_z=car_z; old_yaw=car_yaw;
    previous_wheel_phase=wheel_phase;
    old_foot_x=foot_x; old_foot_z=foot_z; old_foot_yaw=foot_yaw;
    old_camera_width=camera_width;
    old_camera_x=camera_x; old_camera_y=camera_y; old_camera_z=camera_z; old_camera_yaw=camera_yaw;
};

unit(f32,f32,i32) step = fn(steer,drive,flags) {
    snapshot();
    MissionStage begin=stage;
    collision_wait=max_f(0.0,collision_wait-dt_step);
    if (pending_action) { pending_action=false; interact(); };
    if (stage!=MissionStage::delivered && stage!=MissionStage::crossing && stage!=MissionStage::docked && stage!=MissionStage::disembarking) {
        if (!in_car) { walk(steer,drive,flags & 1); };
        move_traffic(0);
        if (in_car) { move_vehicle(steer,drive,sin_small(car_yaw),cos_small(car_yaw),flags & 1); };
        move_traffic(0);
        if (in_car) { move_vehicle(steer,drive,sin_small(car_yaw),cos_small(car_yaw),flags & 1); };
        f32 traveled=(car_x-old_x)*sin_small(car_yaw)+(car_z-old_z)*cos_small(car_yaw);
        wheel_phase=wrap(wheel_phase+traveled/0.32);
        move_peds(0);
        animate_mail(0);
        advance_car_route();
        advance_waterfront();
        advance_avenue();
    };
    if (stage==MissionStage::reach_pier && begin==MissionStage::reach_pier) {
        seconds_left=max_f(0.0,seconds_left-dt_step);
        if (seconds_left<=0.0) { stage=MissionStage::missed_departure; };
    };
    if (stage==MissionStage::missed_departure) { ferry_z=min_f(arrival_z,ferry_z+dt_step*4.0); };
    if (stage==MissionStage::crossing) {
        if (board_time<1.12) {
            board_time=min_f(1.12,board_time+dt_step);
            f32 pace=board_time/1.12;
            foot_x=blend(board_x,dock_x-0.9,pace);
            foot_z=blend(board_z,ferry_z-1.20,pace);
            f32 rise=clamp((foot_z-84.10)/2.64,0.0,1.0);
            board_height=blend(0.01,deck_y,rise);
        } else {
            ferry_z=min_f(arrival_z,ferry_z+dt_step*4.35);
            foot_z=ferry_z-1.20;
            if (ferry_z>=arrival_z) { stage=MissionStage::docked; };
        };
    };
    if (stage==MissionStage::disembarking) {
        board_time=min_f(3.25,board_time+dt_step);
        foot_x=blend(board_x,far_gangway_x,clamp(board_time/0.85,0.0,1.0));
        foot_z=blend(board_z,far_landing_z,clamp((board_time-0.85)/2.40,0.0,1.0));
        foot_yaw=if (board_time<0.85) { 1.57079633 } else { 0.0 };
        f32 ramp=clamp((foot_z-far_gangway_start)/1.65,0.0,1.0);
        board_height=blend(deck_y,0.13,ramp);
        if (board_time>=3.25) { stage=MissionStage::delivered; };
    };
    camera_step();
};

unit(f32,f32,i32,i32) advance = fn(steer,drive,controls,limit) {
    if (limit>0 && accumulator>=dt_step) {
        accumulator=accumulator-dt_step;
        step(steer,drive,controls);
        advance(steer,drive,controls,limit-1);
    };
};
unit(f32,f32,f32,f32,f32) set_model = fn(x,y,z,yaw,roll) {
    model_local=true;
    model_x=x; model_y=y; model_z=z;
    model_hs=sin_small(yaw); model_hc=cos_small(yaw);
    model_rs=sin_small(roll); model_rc=cos_small(roll);
};

unit(f32,f32,f32,f32,bool) tire = fn(x,z,spin_s,spin_c,animated) {
    box(x-0.15,0.031,z-0.33,0.30,0.62,0.66,0.14,0.15,0.21);
    f32 e=if (x<0.0) { x-0.157 } else { x+0.157 };
    if (animated) {
        f32 dy=0.17*spin_c; f32 dz=0.17*spin_s;
        f32 py=0.073*spin_s; f32 pz=0.073*spin_c;
        quad(e,0.341-dy+py,z-dz-pz,e,0.341-dy-py,z-dz+pz,
             e,0.341+dy-py,z+dz+pz,e,0.341+dy+py,z+dz-pz,0.70,0.77,0.83);
    } else {
        quad(e,0.18,z-0.15,e,0.18,z+0.15,e,0.45,z+0.15,e,0.45,z-0.15,0.45,0.49,0.56);
    };
};
unit(f32,f32,f32,f32,f32,f32,f32) light = fn(x,y,z,w,h,r,g) {
    quad(x,y,z,x+w,y,z,x+w,y+h,z,x,y+h,z,r,g,0.19);
};

unit(f32,f32,f32,bool,f32,bool) body = fn(r,g,b,brake,spin,animated) {
    f32 spin_s=if (animated) { sin_small(spin) } else { 0.0 };
    f32 spin_c=if (animated) { cos_small(spin) } else { 1.0 };
    tire(-0.91,-1.19,spin_s,spin_c,animated); tire(0.91,-1.19,spin_s,spin_c,animated);
    tire(-0.91,1.19,spin_s,spin_c,animated); tire(0.91,1.19,spin_s,spin_c,animated);
    box(-0.92,0.32,-1.93,1.84,0.47,3.86,r,g,b);
    box(-0.88,0.79,-1.91,1.76,0.16,1.02,r*1.06,g*1.06,b*1.04);
    box(-0.85,0.79,0.59,1.70,0.16,1.31,r*1.10,g*1.10,b*1.08);
    quad(-0.79,0.77,-0.90, 0.79,0.77,-0.90, 0.70,1.33,-0.66, -0.70,1.33,-0.66,0.29,0.37,0.52);
    quad(0.79,0.77,0.70, -0.79,0.77,0.70, -0.70,1.33,0.46, 0.70,1.33,0.46,0.31,0.53,0.63);
    quad(-0.79,0.77,0.70, -0.79,0.77,-0.90, -0.70,1.33,-0.66, -0.70,1.33,0.46,0.23,0.36,0.50);
    quad(0.79,0.77,-0.90, 0.79,0.77,0.70, 0.70,1.33,0.46, 0.70,1.33,-0.66,0.37,0.52,0.60);
    quad(-0.70,1.33,-0.66, 0.70,1.33,-0.66, 0.70,1.33,0.46, -0.70,1.33,0.46,r,g,b);
    box(-0.70,1.30,-0.72,1.40,0.16,1.18,r,g,b);
    light(-0.93,0.45,-1.94,1.86,0.09,0.69,0.72);
    light(-0.93,0.45,1.94,1.86,0.09,0.69,0.72);
    light(-0.79,0.61,1.94,0.41,0.17,1.0,0.96);
    light(0.38,0.61,1.94,0.41,0.17,1.0,0.96);
    f32 glow=if (brake) { 0.27 } else { 0.04 };
    light(-0.81,0.61,-1.94,0.36,0.17,0.97,glow);
    light(0.45,0.61,-1.94,0.36,0.17,0.97,glow);
};

unit(i32,f32) draw_traffic = fn(i,alpha) {
    if (i<6) {
        u64 n=ix(i);
        f32 dir=traffic[n].signed_lane_direction;
        f32 yaw=if (dir>1.5) { 1.57079633 } else { if (dir < -1.5) { -1.57079633 } else { if (dir>0.0) { 0.0 } else { 3.14159265 } } };
        f32 x=traffic[n].x;
        f32 tx=if (abs_f(previous_traffic[n][0]-x)>2.0) { x } else { blend(previous_traffic[n][0],x,alpha) };
        f32 z=traffic[n].z;
        f32 tz=if (abs_f(previous_traffic[n][1]-z)>2.0) { z } else { blend(previous_traffic[n][1],z,alpha) };
        set_model(tx,0.01,tz,yaw,0.0);
        if (i%2==0) { body(0.24,0.65,0.66,traffic[n].speed<4.0,0.0,false); }
        else { body(0.71,0.54,0.29,traffic[n].speed<4.0,0.0,false); };
        draw_traffic(i+1,alpha);
    };
};

unit(f32,f32,f32,f32) person = fn(r,g,b,gait) {
    f32 wave=sin_small(wrap(gait));
    box(-0.235,0.61,-0.16,0.47,0.54,0.32,r,g,b);
    box(-0.17,1.17,-0.145,0.34,0.36,0.29,0.84,0.61,0.46);
    box(-0.18,1.47,-0.153,0.36,0.08,0.31,0.24,0.17,0.22);
    box(-0.24,0.075,-0.11+wave*0.10,0.18,0.55,0.23,0.29,0.25,0.35);
    box(0.06,0.075,-0.11-wave*0.10,0.18,0.55,0.23,0.29,0.25,0.35);
    box(-0.342,0.56,-0.12-wave*0.10,0.109,0.48,0.18,r*0.84,g*0.84,b*0.84);
    box(0.233,0.56,-0.12+wave*0.10,0.109,0.48,0.18,r*0.84,g*0.84,b*0.84);
};

unit(i32) draw_peds = fn(i) {
    if (i<9) {
        u64 n=ix(i);
        f32 yaw=if (peds[n].toward_second_waypoint) { 0.0 } else { 3.14159265 };
        f32 stun=peds[n].stun_seconds;
        f32 roll=if (stun>0.0) {
            1.48*min_f(clamp((1.65-stun)*7.1,0.0,1.0),clamp(stun*2.6,0.0,1.0))
        } else { 0.0 };
        set_model(peds[n].x,abs_f(sin_small(roll))*0.27,peds[n].z,yaw,roll);
        f32 r=if (i%3==0) { 0.93 } else { 0.31+0.16*float_i(i%3) };
        person(r,0.61,0.49+0.05*float_i(i),peds[n].gait_phase);
        draw_peds(i+1);
    };
};

unit(i32) draw_mail = fn(i) {
    if (i<4) {
        u64 n=ix(i);
        f32 tilt=mailbox[n][2];
        f32 roll=if (mailbox_home[n][0]>0.0) { 0.0-tilt } else { tilt };
        set_model(mailbox[n][0],0.055+sin_small(tilt)*0.21,mailbox[n][1],0.0,roll);
        box(-0.052,0.0,-0.052,0.104,0.83,0.104,0.52,0.36,0.27);
        box(-0.23,0.74,-0.19,0.46,0.26,0.38,0.32,0.58,0.75);
        box(-0.196,0.98,-0.16,0.392,0.07,0.32,0.44,0.70,0.81);
        box(-0.093,0.91,-0.202,0.19,0.035,0.034,0.14,0.23,0.34);
        box(0.22,0.91,0.05,0.045,0.14,0.16,0.91,0.33,0.39);
        draw_mail(i+1);
    };
};

unit(f32) boat = fn(alpha) {
    set_model(11.0,0.0,blend(old_ferry_z,ferry_z,alpha),0.0,0.0);
    box(-3.8,0.00,-2.47,7.6,0.84,10.88,0.28,0.47,0.58);
    box(-3.75,0.79,-2.4,7.5,0.42,10.7,0.95,0.76,0.51);
    box(-3.8,1.21,-2.4,0.14,0.61,10.7,0.93,0.83,0.64);
    box(3.66,1.21,-2.4,0.14,0.61,10.7,0.93,0.83,0.64);
    box(-2.6,1.20,1.75,5.2,2.2,4.5,0.94,0.84,0.69);
    box(-2.69,3.33,1.65,5.38,0.22,4.7,0.38,0.63,0.67);
    box(-2.22,2.23,1.66,4.44,0.75,0.13,0.30,0.56,0.66);
    box(-2.66,2.23,2.04,0.13,0.75,3.80,0.32,0.57,0.64);
    box(2.53,2.23,2.04,0.13,0.75,3.80,0.32,0.57,0.64);
    box(-0.085,3.55,4.12,0.17,1.94,0.17,0.65,0.54,0.48);
    box(-1.13,4.19,4.12,1.12,0.64,0.11,0.94,0.45,0.43);
    quad(-1.44,0.04,-3.90,1.44,0.04,-3.90,1.44,1.21,-1.26,-1.44,1.21,-1.26,0.82,0.64,0.45);
    if (stage==MissionStage::docked || stage==MissionStage::disembarking || stage==MissionStage::delivered) {
        f32 right=far_gangway_x-11.0;
        f32 start=far_gangway_start-arrival_z;
        quad(right-0.53,deck_y,start,right+0.53,deck_y,start,right+0.53,0.13,start+1.65,right-0.53,0.13,start+1.65,0.88,0.68,0.48);
    };
};

unit(f32,f32,f32,f32,f32) objective = fn(x,z,r,g,b) {
    f32 t=0.27;
    if (stage==MissionStage::pickup_tape) {
        box(x-0.36,0.04,z-0.27,0.72,0.52,0.54,0.83,0.61,0.41);
        box(x-0.23,0.56,z-0.129,0.46,0.083,0.258,0.31,0.23,0.37);
        box(x-0.19,0.644,z-0.085,0.38,0.025,0.17,0.88,0.42,0.54);
        t=0.41;
    };
    diamond(x,1.67,z,t,0.78,r,g,b);
    tri(x-t,1.67,z,x,1.22,z,x,1.67,z+t,r*0.77,g*0.77,b*0.77);
    tri(x+t,1.67,z,x,1.22,z,x,1.67,z-t,r*0.77,g*0.77,b*0.77);
};

unit(i32) shadow_arc = fn(i) {
    if (i<8) {
        f32 a=wrap(float_i(i)*0.78539816);
        f32 b=wrap(float_i(i+1)*0.78539816);
        put(0.13,0.0,0.09,0.0,0.0,-0.68);
        put(cos_small(a)*1.61,0.0,sin_small(a)*2.66,0.0,0.0,-0.001);
        put(cos_small(b)*1.61,0.0,sin_small(b)*2.66,0.0,0.0,-0.001);
        shadow_arc(i+1);
    };
};

unit(i32,f32) traffic_shadows = fn(i,alpha) {
    if (i<6) {
        u64 n=ix(i);
        f32 x=traffic[n].x; f32 z=traffic[n].z;
        f32 tx=if (abs_f(previous_traffic[n][0]-x)>2.0) { x } else { blend(previous_traffic[n][0],x,alpha) };
        f32 tz=if (abs_f(previous_traffic[n][1]-z)>2.0) { z } else { blend(previous_traffic[n][1],z,alpha) };
        f32 heading=if (abs_f(traffic[n].signed_lane_direction)>1.5) { 1.57079633 } else { 0.0 };
        set_model(tx,0.031,tz,heading,0.0);
        shadow_arc(0);
        traffic_shadows(i+1,alpha);
    };
};

unit(f32,f32,f32,f32) stern_ribbon = fn(s,stern,span,strength) {
    f32 x=11.0+s*2.35;
    f32 mid_x=11.0+s*3.22;
    f32 tail_x=11.0+s*4.78;
    f32 mid_z=stern-span*0.40;
    f32 tail_z=stern-span;
    put(x-0.14,-0.017,stern,0.50,strength*0.70,0.72);
    put(x+0.14,-0.017,stern,0.50,strength*0.70,0.72);
    put(mid_x+0.34,-0.017,mid_z,0.50,strength,0.72);
    put(x-0.14,-0.017,stern,0.50,strength*0.70,0.72);
    put(mid_x+0.34,-0.017,mid_z,0.50,strength,0.72);
    put(mid_x-0.34,-0.017,mid_z,0.50,strength,0.72);
    put(mid_x-0.34,-0.017,mid_z,0.50,strength,0.72);
    put(mid_x+0.34,-0.017,mid_z,0.50,strength,0.72);
    put(tail_x+0.57,-0.017,tail_z,0.50,0.0,0.72);
    put(mid_x-0.34,-0.017,mid_z,0.50,strength,0.72);
    put(tail_x+0.57,-0.017,tail_z,0.50,0.0,0.72);
    put(tail_x-0.57,-0.017,tail_z,0.50,0.0,0.72);
};

unit(f32) ferry_wake = fn(alpha) {
    if (ferry_z>old_ferry_z && (stage==MissionStage::crossing || stage==MissionStage::missed_departure)) {
        f32 distance=blend(old_ferry_z,ferry_z,alpha)-berth_z;
        f32 strength=0.38*clamp(distance*0.55,0.0,1.0);
        f32 stern=berth_z+distance-2.43;
        f32 span=min_f(10.8,1.60+distance);
        surface_paint=paint_wake;
        stern_ribbon(-1.0,stern,span,strength);
        stern_ribbon(1.0,stern,span,strength);
        surface_paint=0;
    };
};

unit(f32) pier_signal_lens = fn(alpha) {
    bool boarding=stage==MissionStage::reach_pier;
    bool underway=stage==MissionStage::crossing && board_time>=1.12;
    f32 pulse=if (underway) {
        f32 travel=blend(old_ferry_z,ferry_z,alpha)-berth_z;
        0.81+0.16*sin_small(wrap(travel*0.24-3.14159265))
    } else { 0.0 };
    f32 r=if (boarding) { 0.33 } else { if (underway) { 0.36 } else { 1.0 } };
    f32 g=if (boarding) { 1.0 } else { if (underway) { 0.71*pulse } else { 0.55 } };
    f32 b=if (boarding) { 0.74 } else { if (underway) { pulse } else { 0.29 } };
    surface_paint=paint_pier_signal;
    f32 x=pier_signal_x;
    f32 z=pier_signal_z-0.018;
    quad(x-0.22,1.85,z,x+0.22,1.85,z,x+0.22,2.31,z,x-0.22,2.31,z,r,g,b);
    surface_paint=0;
};

unit(f32) render_moving = fn(alpha) {
    vertex_count=0; drawing_world=false;
    f32 vis_yaw=wrap(old_yaw+alpha*wrap(car_yaw-old_yaw));
    set_model(blend(old_x,car_x,alpha),0.01,blend(old_z,car_z,alpha),vis_yaw,car_roll);
    f32 spin=wrap(previous_wheel_phase+alpha*wrap(wheel_phase-previous_wheel_phase));
    body(0.86,0.26,0.45,brake_mark>0.0,spin,true);
    if (!in_car) {
        f32 view_foot=wrap(old_foot_yaw+alpha*wrap(foot_yaw-old_foot_yaw));
        bool aboard=stage==MissionStage::crossing || stage==MissionStage::docked || stage==MissionStage::disembarking || stage==MissionStage::delivered;
        f32 height=if (aboard) { blend(old_board_height,board_height,alpha) } else { 0.01 };
        set_model(blend(old_foot_x,foot_x,alpha),height,blend(old_foot_z,foot_z,alpha),view_foot,0.0);
        f32 gait=if (stage==MissionStage::delivered || stage==MissionStage::docked || (stage==MissionStage::crossing && board_time>=1.12)) { 0.0 } else { (foot_x+foot_z)*2.7 };
        person(0.36,0.83,0.76,wrap(gait-6.2831853*float_i(core.float_to_sint_trunc<i32>(gait/6.2831853))));
    };
    draw_traffic(0,alpha);
    draw_mail(0);
    draw_peds(0);
    boat(alpha);
    model_local=false;
    ferry_wake(alpha);
    pier_signal_lens(alpha);
    if (stage==MissionStage::answer_phone) { objective(phone_x,phone_z,1.0,0.77,0.40); };
    if (stage==MissionStage::pickup_tape) {
        if (follows_backstreet()) { objective(tape_guide_x(),tape_guide_z(),0.85,0.95,0.60); }
        else { objective(tape_x,tape_z,1.0,0.63,0.35); };
    };
    if (stage==MissionStage::reach_pier) { objective(pier_guide_x(),pier_guide_z(),0.47,0.99,0.78); };
    if (stage==MissionStage::crossing || stage==MissionStage::docked) { objective(far_gangway_x,far_landing_z,0.88,0.93,0.61); };
    shadow_pass=true;
    set_model(blend(old_x,car_x,alpha),0.031,blend(old_z,car_z,alpha),vis_yaw,0.0);
    shadow_arc(0);
    traffic_shadows(0,alpha);
    shadow_pass=false;
    model_local=false;
    unsafe { host.moving(core.pointer_cast<*?u8>(&?moving_mesh[0][0][0][0]),vertex_count*6); };
};

unit(f32) render_frame = fn(alpha) {
    f32 view_yaw=wrap(old_camera_yaw+alpha*wrap(camera_yaw-old_camera_yaw));
    f32 hx=sin_small(view_yaw); f32 hz=cos_small(view_yaw);
    f32 ps=sin_small(camera_pitch); f32 pc=cos_small(camera_pitch);
    f32 fx=hx*pc; f32 fy=ps; f32 fz=hz*pc;
    f32 ux=-hx*ps; f32 uy=pc; f32 uz=-hz*ps;
    f32 ex=blend(old_camera_x,camera_x,alpha);
    f32 ey=blend(old_camera_y,camera_y,alpha);
    f32 ez=blend(old_camera_z,camera_z,alpha);
    f32 lens=blend(1.0,0.76,blend(old_camera_width,camera_width,alpha));
    f32 sy=lens*(if (viewport<0.85) { 1.16 } else { 1.48 });
    f32 sx=sy/viewport;
    f32 nf=1.000770;
    display[0]=hz*sx; display[1]=ux*sy; display[2]=fx*nf; display[3]=fx;
    display[4]=0.0; display[5]=uy*sy; display[6]=fy*nf; display[7]=fy;
    display[8]=-hx*sx; display[9]=uz*sy; display[10]=fz*nf; display[11]=fz;
    display[12]=-(hz*ex-hx*ez)*sx;
    display[13]=-(ux*ex+uy*ey+uz*ez)*sy;
    f32 offset=-(fx*ex+fy*ey+fz*ez);
    display[14]=offset*nf-0.30012;
    display[15]=offset;
    f32 px=player_x(); f32 pz=player_z();
    f32 tx=if (stage==MissionStage::answer_phone) { phone_x } else { if (stage==MissionStage::pickup_tape) { tape_guide_x() } else { if (stage==MissionStage::reach_pier) { pier_guide_x() } else { px } } };
    f32 tz=if (stage==MissionStage::answer_phone) { phone_z } else { if (stage==MissionStage::pickup_tape) { tape_guide_z() } else { if (stage==MissionStage::reach_pier) { pier_guide_z() } else { pz } } };
    f32 dx=tx-px; f32 dz=tz-pz;
    f32 heading=if (in_car) { car_yaw } else { 0.0 };
    f32 distance=length(dx,dz);
    display[16]=if (in_car) { 1.0 } else { 0.0 };
    display[17]=float_i(mission_stage_code(stage));
    display[18]=seconds_left;
    display[19]=3.6*(if (in_car) { length(vx,vz) } else { foot_speed });
    display[20]=float_i(cue());
    display[21]=float_i(collision_kind);
    display[22]=float_i(collision_seq);
    display[23]=distance;
    display[24]=tx; display[25]=tz; display[26]=px; display[27]=pz;
    display[28]=heading;
    display[29]=if ((stage!=MissionStage::pickup_tape && stage!=MissionStage::reach_pier && stage!=MissionStage::answer_phone) || distance<0.25) { 0.0 } else { wrap(bearing(dx,dz)-heading) };
    unsafe { host.frame(core.pointer_cast<*?u8>(&?display[0]),30); };
};

unit(i32) reset_props = fn(i) {
    if (i<9) {
        u64 n=ix(i);
        peds[n].x=sidewalks[n][0]; peds[n].z=sidewalks[n][1]; peds[n].toward_second_waypoint=true;
        peds[n].stun_seconds=0.0; peds[n].slide_x=0.0; peds[n].slide_z=0.0; peds[n].gait_phase=0.0;
        if (i<4) {
            mailbox[n][0]=mailbox_home[n][0]; mailbox[n][1]=mailbox_home[n][1];
            mailbox[n][2]=0.0; mailbox[n][3]=0.0;
        };
        if (i<6) {
            traffic[n].x=traffic_home[n][0]; traffic[n].z=traffic_home[n][1];
            traffic[n].signed_lane_direction=if (i>=4) { if (i==4) { 2.0 } else { -2.0 } } else { if (i%2==0) { 1.0 } else { -1.0 } };
            traffic[n].speed=if (i==0) { 5.0 } else { 2.7 };
        };
        reset_props(i+1);
    };
};

unit() cancel_action = fn { pending_action=false; };

unit(i32) reset = fn(mode) {
    if (!world_ready) { render_world(); };
    stage=if (mode==1) { MissionStage::free_roam } else { MissionStage::answer_phone };
    in_car=false; pending_action=false; seconds_left=90.0; accumulator=0.0;
    bypass=true; park_walk=false; waterfront_leg=-1; avenue_leg=-1; avenue_walk_leg=-1; pickup_leg=0; return_leg=0;
    collision_wait=0.0; collision_kind=0; collision_seq=0;
    car_x=0.0; car_z=if (mode==1) { -5.0 } else { -7.0 };
    car_yaw=if (mode==1) { 0.0 } else { 3.14159265 };
    vx=0.0; vz=0.0; brake_mark=0.0; car_roll=0.0; wheel_phase=0.0;
    foot_x=2.1; foot_z=-4.6; foot_speed=0.0; foot_yaw=0.0;
    camera_x=2.1; camera_z=-11.6; camera_y=3.9; camera_yaw=0.0; camera_pitch=-0.25; wide_camera=false; camera_width=0.0;
    ferry_z=berth_z; board_time=0.0; board_height=0.01;
    reset_props(0); snapshot();
    render_moving(1.0); render_frame(1.0);
};

unit(f32,f32,f32,i32,f32) tick = fn(dt,steer,drive,controls,aspect) {
    if (aspect>=0.25 && aspect<=4.0) { viewport=aspect; };
    if ((controls & 4)!=0) { wide_camera=!wide_camera; };
    if ((controls & 2)!=0 && stage!=MissionStage::delivered && stage!=MissionStage::missed_departure && stage!=MissionStage::crossing && stage!=MissionStage::disembarking) {
        pending_action=true;
    };
    f32 safe_dt=if (dt>=0.0 && dt<=1.0) { min_f(dt,0.10) } else { 0.0 };
    accumulator=accumulator+safe_dt;
    f32 steering=if (steer>=-1.0 && steer<=1.0) { steer } else { 0.0 };
    f32 throttle=if (drive>=-1.0 && drive<=1.0) { drive } else { 0.0 };
    if (safe_dt>0.0) { advance(steering,throttle,controls,6); };
    f32 alpha=clamp(accumulator/dt_step,0.0,1.0);
    render_moving(alpha);
    render_frame(alpha);
};
%%end
