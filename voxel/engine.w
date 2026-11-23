%%start
host = extern wasm "showcase" {
	unsafe unit(*?u8, i32, i32, i32) mesh;
	unsafe unit(*?u8, i32, i32) atlas;
	unsafe unit(*?u8, i32) frame;
	unsafe unit(*?u8, i32) outline;
	unsafe unit(*?u8, i32) water;
	unsafe unit(*?u8, i32) horizon;
	unsafe unit(*?u8, i32) player;
	unit(f32, f32) aim;
};

f32[6] blank_vertex = [0.0, 0.0, 0.0, 0.0, 0.0, 0.0];
u8[96] blank_cells = [
	0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
	0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
	0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
	0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
	0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
	0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
];
u8[96][96] blank_layer = [
	blank_cells, blank_cells, blank_cells, blank_cells, blank_cells, blank_cells, blank_cells, blank_cells,
	blank_cells, blank_cells, blank_cells, blank_cells, blank_cells, blank_cells, blank_cells, blank_cells,
	blank_cells, blank_cells, blank_cells, blank_cells, blank_cells, blank_cells, blank_cells, blank_cells,
	blank_cells, blank_cells, blank_cells, blank_cells, blank_cells, blank_cells, blank_cells, blank_cells,
	blank_cells, blank_cells, blank_cells, blank_cells, blank_cells, blank_cells, blank_cells, blank_cells,
	blank_cells, blank_cells, blank_cells, blank_cells, blank_cells, blank_cells, blank_cells, blank_cells,
	blank_cells, blank_cells, blank_cells, blank_cells, blank_cells, blank_cells, blank_cells, blank_cells,
	blank_cells, blank_cells, blank_cells, blank_cells, blank_cells, blank_cells, blank_cells, blank_cells,
	blank_cells, blank_cells, blank_cells, blank_cells, blank_cells, blank_cells, blank_cells, blank_cells,
	blank_cells, blank_cells, blank_cells, blank_cells, blank_cells, blank_cells, blank_cells, blank_cells,
	blank_cells, blank_cells, blank_cells, blank_cells, blank_cells, blank_cells, blank_cells, blank_cells,
	blank_cells, blank_cells, blank_cells, blank_cells, blank_cells, blank_cells, blank_cells, blank_cells
];
u8[96][96][16] world = [
	blank_layer, blank_layer, blank_layer, blank_layer, blank_layer, blank_layer, blank_layer, blank_layer,
	blank_layer, blank_layer, blank_layer, blank_layer, blank_layer, blank_layer, blank_layer, blank_layer
];
f32[6][24] blank_vertices = [
	blank_vertex, blank_vertex, blank_vertex, blank_vertex, blank_vertex, blank_vertex, blank_vertex, blank_vertex, blank_vertex, blank_vertex, blank_vertex, blank_vertex,
	blank_vertex, blank_vertex, blank_vertex, blank_vertex, blank_vertex, blank_vertex, blank_vertex, blank_vertex, blank_vertex, blank_vertex, blank_vertex, blank_vertex
];
f32[6][24][24] blank_mesh_row = [
	blank_vertices, blank_vertices, blank_vertices, blank_vertices, blank_vertices, blank_vertices, blank_vertices, blank_vertices, blank_vertices, blank_vertices, blank_vertices, blank_vertices,
	blank_vertices, blank_vertices, blank_vertices, blank_vertices, blank_vertices, blank_vertices, blank_vertices, blank_vertices, blank_vertices, blank_vertices, blank_vertices, blank_vertices
];
f32[6][24][24][24] blank_mesh_layer = [
	blank_mesh_row, blank_mesh_row, blank_mesh_row, blank_mesh_row, blank_mesh_row, blank_mesh_row, blank_mesh_row, blank_mesh_row, blank_mesh_row, blank_mesh_row, blank_mesh_row, blank_mesh_row,
	blank_mesh_row, blank_mesh_row, blank_mesh_row, blank_mesh_row, blank_mesh_row, blank_mesh_row, blank_mesh_row, blank_mesh_row, blank_mesh_row, blank_mesh_row, blank_mesh_row, blank_mesh_row
];
f32[6][24][24][20] horizon_vertices = [
	blank_mesh_row, blank_mesh_row, blank_mesh_row, blank_mesh_row, blank_mesh_row,
	blank_mesh_row, blank_mesh_row, blank_mesh_row, blank_mesh_row, blank_mesh_row,
	blank_mesh_row, blank_mesh_row, blank_mesh_row, blank_mesh_row, blank_mesh_row,
	blank_mesh_row, blank_mesh_row, blank_mesh_row, blank_mesh_row, blank_mesh_row
];
f32[6][24][24] avatar_vertices = blank_mesh_row;
f32[6][24][24][24][4] vertices = [
	blank_mesh_layer, blank_mesh_layer, blank_mesh_layer, blank_mesh_layer
];
f32[6] blank_wire_vertex = [0.0, 0.0, 0.0, 0.9, 1.0, 0.54];
f32[6][24] wire = [
	blank_wire_vertex, blank_wire_vertex, blank_wire_vertex, blank_wire_vertex, blank_wire_vertex, blank_wire_vertex,
	blank_wire_vertex, blank_wire_vertex, blank_wire_vertex, blank_wire_vertex, blank_wire_vertex, blank_wire_vertex,
	blank_wire_vertex, blank_wire_vertex, blank_wire_vertex, blank_wire_vertex, blank_wire_vertex, blank_wire_vertex,
	blank_wire_vertex, blank_wire_vertex, blank_wire_vertex, blank_wire_vertex, blank_wire_vertex, blank_wire_vertex
];
u8[4] blank_texel = [0, 0, 0, 0];
u8[4][16] blank_tile_line = [
	blank_texel, blank_texel, blank_texel, blank_texel, blank_texel, blank_texel, blank_texel, blank_texel,
	blank_texel, blank_texel, blank_texel, blank_texel, blank_texel, blank_texel, blank_texel, blank_texel
];
u8[4][16][8] blank_atlas_line = [
	blank_tile_line, blank_tile_line, blank_tile_line, blank_tile_line, blank_tile_line, blank_tile_line, blank_tile_line, blank_tile_line
];
u8[4][16][8][16] block_atlas = [
	blank_atlas_line, blank_atlas_line, blank_atlas_line, blank_atlas_line, blank_atlas_line, blank_atlas_line, blank_atlas_line, blank_atlas_line,
	blank_atlas_line, blank_atlas_line, blank_atlas_line, blank_atlas_line, blank_atlas_line, blank_atlas_line, blank_atlas_line, blank_atlas_line
];
bool atlas_ready = false;
f32[44] frame_values = [
	0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0,
	0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0,
	0.0, 1.0, 0.0, 0.0, 0.0,
	0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0
];
i32 write_position = 0;
i32 wire_position = 0;
struct copy CellPosition {
	i32 x;
	i32 y;
	i32 z;
}

struct copy RayHit {
	CellPosition position;
	i32 face;
}

CellPosition zero_cell = { .x = 0; .y = 0; .z = 0; };
RayHit no_hit = { .position = zero_cell; .face = -1; };
RayHit selected_hit = no_hit;
bool outline_dirty = true;
RayHit target_hit = no_hit;
i32 pick_result_x = 0;
i32 pick_result_y = 0;
i32 pick_result_z = 0;
bool target_dirty = true;
bool orientation_dirty = true;
f32 sin_yaw = 0.0;
f32 cos_yaw = 1.0;
f32 sin_pitch = 0.0;
f32 cos_pitch = 1.0;
i32 controls = 0;
i32 pulse_controls = 0;
i32 held_edits = 0;
i32 repeat_edit_mode = -1;
f32 repeat_edit_wait = 0.0;
i32 selected_material = 2;
bool flying = false;
bool grounded = false;
bool ground_contact_dirty = false;
bool jump_pending = false;
f32 vertical_speed = 0.0;
bool third_person = false;
f32 boom_distance = 0.0;
bool boom_initialized = false;
bool avatar_visible = false;
f32 edit_pose_time = 0.0;
bool edit_pose_place = false;
f32 avatar_edit_time = 0.0;
bool avatar_edit_place = false;
bool aim_was_offset = false;
i32 avatar_position = 0;
f32 avatar_x = 0.0;
f32 avatar_y = 0.0;
f32 avatar_z = 0.0;
f32 avatar_yaw = 0.0;
f32 gait_phase = 0.0;
f32 gait_weight = 0.0;
f32 air_weight = 0.0;
f32 swim_weight = 0.0;
f32 swim_phase = 0.0;
f32 avatar_phase = 0.0;
f32 avatar_gait = 0.0;
f32 avatar_air = 0.0;
f32 avatar_swim = 0.0;
f32 avatar_swim_phase = 0.0;
f32 flight_pitch = 0.0;
f32 flight_bank = 0.0;
f32 avatar_flight_pitch = 0.0;
f32 avatar_flight_bank = 0.0;
f32 avatar_pitch_sine = 0.0;
f32 avatar_pitch_cosine = 1.0;
f32 avatar_bank_sine = 0.0;
f32 avatar_bank_cosine = 1.0;
f32 avatar_joint_y = 0.0;
f32 avatar_joint_sine = 0.0;
f32 avatar_joint_cosine = 1.0;
f32 view_scale = 1.77;
f32 player_radius = 0.30;
f32 player_feet = 1.62;
f32 player_head = 0.18;
f32 contact_skin = 0.0001;
struct CameraPose {
	f32 x;
	f32 y;
	f32 z;
	f32 yaw;
	f32 pitch;
}
CameraPose camera_pose = { .x = 32.0; .y = 16.5; .z = 34.5; .yaw = -0.72664234; .pitch = -0.379571; };
f32 clock_seconds = 0.0;
f32 sea_phase = 0.0;
f32 sea_level = 2.55;
f32 sea_low = 2.55;
f32 tide_span = 1.85;
f32 lamp_offset = 0.90;
f32 lamp_limit = 3.2;
enum copy BeaconPhase {
	sandbox;
	active;
	restored;
	flooded;
}
BeaconPhase beacon_phase = BeaconPhase::sandbox;
i32 bridge_blocks = 12;
bool lighthouse_hunt = false;
bool archipelago_hunt = false;
i32 north_cave_z = -56;
i32 eastern_summit_x = 132;
i32 western_wreck_x = -56;
i32 lighthouse_parts = 0;
f32 lens_x = 16.5;
f32 regulator_z = 31.5;
f32 igniter_z = 13.5;
i32[48] empty_loose_axis = [
	0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
	0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
	0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
	0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
];
i32[48] loose_x = empty_loose_axis;
i32[48] loose_y = empty_loose_axis;
i32[48] loose_z = empty_loose_axis;
i32 loose_count = 0;
i32 beacon_guide = 0;
i32 guide_drop_slot = -1;
i32 terrain_chunk_x = 0;
i32 terrain_chunk_z = 0;
bool terrain_window_active = false;
i32 world_seed = 471;
i32 relay_stage = 0;
i32 sandbox_material = 2;
f32 beacon_elapsed = 0.0;
f32 lamp_wet = 0.0;
f32 tide_progress = 0.0;
u8[96][96][16] sandbox_cells = world;
f32 swell = 0.18;
f32 chop = 0.10;
i32 sea_mesh_width = 0;
i32 sea_origin_x = -20;
i32 sea_origin_z = -20;
f32[37] blank_sea_samples = [
	0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0,
	0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0,
	0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0,
	0.0
];
f32[37][37] sea_samples = [
	blank_sea_samples, blank_sea_samples, blank_sea_samples, blank_sea_samples, blank_sea_samples, blank_sea_samples,
	blank_sea_samples, blank_sea_samples, blank_sea_samples, blank_sea_samples, blank_sea_samples, blank_sea_samples,
	blank_sea_samples, blank_sea_samples, blank_sea_samples, blank_sea_samples, blank_sea_samples, blank_sea_samples,
	blank_sea_samples, blank_sea_samples, blank_sea_samples, blank_sea_samples, blank_sea_samples, blank_sea_samples,
	blank_sea_samples, blank_sea_samples, blank_sea_samples, blank_sea_samples, blank_sea_samples, blank_sea_samples,
	blank_sea_samples, blank_sea_samples, blank_sea_samples, blank_sea_samples, blank_sea_samples, blank_sea_samples,
	blank_sea_samples
];
f32[6][6] blank_sea_quad = [blank_vertex, blank_vertex, blank_vertex, blank_vertex, blank_vertex, blank_vertex];
f32[6][6][36] blank_sea_row = [
	blank_sea_quad, blank_sea_quad, blank_sea_quad, blank_sea_quad, blank_sea_quad, blank_sea_quad,
	blank_sea_quad, blank_sea_quad, blank_sea_quad, blank_sea_quad, blank_sea_quad, blank_sea_quad,
	blank_sea_quad, blank_sea_quad, blank_sea_quad, blank_sea_quad, blank_sea_quad, blank_sea_quad,
	blank_sea_quad, blank_sea_quad, blank_sea_quad, blank_sea_quad, blank_sea_quad, blank_sea_quad,
	blank_sea_quad, blank_sea_quad, blank_sea_quad, blank_sea_quad, blank_sea_quad, blank_sea_quad,
	blank_sea_quad, blank_sea_quad, blank_sea_quad, blank_sea_quad, blank_sea_quad, blank_sea_quad
];
f32[6][6][36][36] sea_vertices = [
	blank_sea_row, blank_sea_row, blank_sea_row, blank_sea_row, blank_sea_row, blank_sea_row,
	blank_sea_row, blank_sea_row, blank_sea_row, blank_sea_row, blank_sea_row, blank_sea_row,
	blank_sea_row, blank_sea_row, blank_sea_row, blank_sea_row, blank_sea_row, blank_sea_row,
	blank_sea_row, blank_sea_row, blank_sea_row, blank_sea_row, blank_sea_row, blank_sea_row,
	blank_sea_row, blank_sea_row, blank_sea_row, blank_sea_row, blank_sea_row, blank_sea_row,
	blank_sea_row, blank_sea_row, blank_sea_row, blank_sea_row, blank_sea_row, blank_sea_row
];

u64(i32) index_of = fn(value) { core.int_extend<u64>(value) };

i32() creative_columns = fn { 4 };

i32() terrain_columns = fn { 8 };

i32() terrain_span = fn {
	12 * (if (beacon_phase == BeaconPhase::sandbox) { creative_columns() } else { terrain_columns() })
};

f32() terrain_span_f = fn { core.sint_to_float<f32>(terrain_span()) };

bool(i32, i32, i32) inside = fn(x, y, z) {
	i32 span = terrain_span();
	x >= 0 && x < span && y >= 0 && y < 16 && z >= 0 && z < span
};

i32() adventure_min = fn { -384 };

i32() adventure_max = fn { 480 };

bool(i32, i32) adventure_column = fn(x, z) {
	beacon_phase != BeaconPhase::sandbox && x >= adventure_min() && x < adventure_max()
		&& z >= adventure_min() && z < adventure_max()
};

i32(i32, i32) grid_axis = fn(value, span) {
	value / span - (if (value % span < 0) { 1 } else { 0 })
};

i32(i32, i32) grid_local = fn(value, span) {
	i32 local = value % span;
	if (local < 0) { local + span } else { local }
};

i32(i32, i32, i32) seeded_lattice = fn(x, z, salt) {
	i64 key = core.int_extend<i64>(world_seed) + 2147483648;
	i64 offset = core.int_extend<i64>(x) * 374761393 + core.int_extend<i64>(z) * 668265263 + core.int_extend<i64>(salt) * 1597334677;
	i64 mixed = (key * 747796405 + offset) & 4294967295;
	i64 folded = ((mixed ^ (mixed >> 16)) * 73244475) & 4294967295;
	i64 hash = ((folded ^ (folded >> 16)) * 73244475) & 4294967295;
	i64 packed_result = (hash ^ (hash >> 16)) & 255;
	core.int_trunc<i32>(packed_result)
};

i32(i32, i32) smooth_grid = fn(offset, span) {
	offset * offset * (3 * span - 2 * offset) * 256 / (span * span * span)
};

i32(i32, i32, i32, i32) archipelago_noise = fn(x, z, span, salt) {
	i32 gx = grid_axis(x, span);
	i32 gz = grid_axis(z, span);
	i32 tx = smooth_grid(grid_local(x, span), span);
	i32 tz = smooth_grid(grid_local(z, span), span);
	i32 near = seeded_lattice(gx, gz, salt) * (256 - tx) + seeded_lattice(gx + 1, gz, salt) * tx;
	i32 far = seeded_lattice(gx, gz + 1, salt) * (256 - tx) + seeded_lattice(gx + 1, gz + 1, salt) * tx;
	(near * (256 - tz) + far * tz) / 65536
};

i32(i32, i32) archipelago_height = fn(x, z) {
	i32 dx = if (x < 0) { -x } else { if (x >= 96) { x - 95 } else { 0 } };
	i32 dz = if (z < 0) { -z } else { if (z >= 96) { z - 95 } else { 0 } };
	i32 from_harbor = if (dx > dz) { dx } else { dz };
	i32 inland = archipelago_noise(x, z, 52, 0);
	i32 hills = archipelago_noise(x, z, 18, 1);
	i32 ridge = min_i(15, max_i(0, (inland * 4 + hills - 600) / 30));
	i32 edge_x = min_i(x - adventure_min(), adventure_max() - 1 - x);
	i32 edge_z = min_i(z - adventure_min(), adventure_max() - 1 - z);
	i32 to_ocean = min_i(edge_x, edge_z);
	if (to_ocean < 24) { ridge * to_ocean / 24 } else {
		if (from_harbor < 18) { ridge * (from_harbor - 1) / 17 } else { ridge }
	}
};

i32(i32, i32, i32) archipelago_passage = fn(x, z, height) {
	if (height >= 4) {
		i32 vein = archipelago_noise(x, z, 19, 2) - 128;
		if (vein >= -16 && vein <= 16) { 3 + archipelago_noise(x, z, 36, 3) / 128 } else { 0 }
	} else { 0 }
};

u8(i32, i32, i32) archipelago_material = fn(y, height, passage) {
	if (y > height || (passage != 0 && y >= passage && y < passage + 3 && y != height)) { 0 } else {
		if (y == height) {
			if (height <= 5) { 4 } else { if (height >= 12) { 3 } else { 1 } }
		} else { if (y + 2 >= height && height > 5 && height < 12) { 2 } else { 3 } }
	}
};

i32[16] blank_column_cache = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
i32[16][8] cache_x = [blank_column_cache, blank_column_cache, blank_column_cache, blank_column_cache, blank_column_cache, blank_column_cache, blank_column_cache, blank_column_cache];
i32[16][8] cache_z = cache_x;
i32[16][8] cache_seed = cache_x;
i32[16][8] cache_height = cache_x;
i32[16][8] cache_passage = cache_x;

i32(i32, i32, u64, u64) sampled_height = fn(x, z, ix, iz) {
	if (cache_x[iz][ix] != x || cache_z[iz][ix] != z || cache_seed[iz][ix] != world_seed) {
		cache_x[iz][ix] = x;
		cache_z[iz][ix] = z;
		cache_seed[iz][ix] = world_seed;
		cache_height[iz][ix] = archipelago_height(x, z);
		cache_passage[iz][ix] = -1;
	};
	cache_height[iz][ix]
};

i32(i32, i32, i32) choose_cave_depth = fn(at, first, best) {
	if (at == 9) { best } else {
		i32 index = (first + at) % 9;
		i32 z = -48 - index * 4;
		if (archipelago_height(28, z) >= 7) { z } else { choose_cave_depth(at + 1, first, best) }
	}
};

bool(i32, i32) cave_shelf_column = fn(x, z) {
	archipelago_hunt && x >= 25 && x <= 31 && z < 0 && z >= north_cave_z - 8
};

u8(i32, i32, i32) cave_shelf_material = fn(x, y, z) {
	i32 width = abs_i(x - 28);
	i32 from_cave = abs_i(z - north_cave_z);
	i32 floor = if (width <= 2) { 4 } else { 3 };
	if (from_cave <= 8 && width <= 3) {
		i32 roof = 10 + (8 - from_cave) / 3 - width / 2;
		bool opening = width <= 2 && z >= north_cave_z - 5 && y >= 5 && y <= 8;
		if (y > roof || opening) { 0 } else { 3 }
	} else {
		if (y > floor) { 0 } else { if (y == floor && width == 3) { 4 } else { 3 } }
	}
};

i32(i32, i32, i32) choose_summit = fn(at, first, best) {
	if (at == 9) { best } else {
		i32 index = (first + at) % 9;
		i32 x = 124 + 4 * index;
		if (archipelago_height(x, 15) >= 10) { x } else { choose_summit(at + 1, first, best) }
	}
};

bool(i32, i32) summit_column = fn(x, z) {
	archipelago_hunt && x >= 96 && x <= eastern_summit_x + 15 && z >= 9 && z <= 21
};

i32(i32, i32) summit_floor = fn(x, z) {
	i32 rising = min_i(10, (x - 96) * 10 / (eastern_summit_x - 99));
	i32 down = max_i(0, x - eastern_summit_x - 3);
	i32 side = max_i(0, abs_i(z - 15) - 2) * 2;
	max_i(0, 2 + rising - down - side)
};

u8(i32, i32) summit_material = fn(y, floor) {
	if (y > floor) { 0 } else {
		if (y == floor && floor >= 5 && floor <= 8) { 1 } else { if (y == floor && floor < 5) { 4 } else { 3 } }
	}
};

i32(i32, i32, i32) choose_wreck = fn(at, first, best) {
	if (at == 9) { best } else {
		i32 index = (first + at) % 9;
		i32 x = -48 - index * 4;
		if (archipelago_height(x, 33) <= 5) { x } else { choose_wreck(at + 1, first, best) }
	}
};

bool(i32, i32) wreck_column = fn(x, z) {
	archipelago_hunt && x < 0 && x >= western_wreck_x - 13 && z >= 27 && z <= 39
};

u8(i32, i32, i32) wreck_material = fn(x, y, z) {
	i32 length = x - western_wreck_x;
	i32 from_center = abs_i(z - 33);
	i32 bank = max_i(0, min_i(4, 2 + (-x - 1) / 8) - max_i(0, from_center - 2));
	bool hull = length >= -8 && length <= 7 && from_center <= (if (length < -5) { 1 } else { 3 });
	bool planks = hull && y >= 3 && y <= 5 && (y >= 4 || from_center <= 2);
	bool broken_rail = hull && y == 6 && from_center >= 2
		&& (length < -2 || length >= 3 || (z == 36 && length >= -1));
	bool mast = length == -3 && z == 35 && y >= 6 && y <= 10;
	bool spar = z == 35 && length >= -3 && length <= 1 && y == 9;
	bool sail = z == 35 && (length == -2 || length == -1) && (y == 7 || y == 8);
	if (sail) { 4 } else {
		if (planks || broken_rail || mast || spar) { 5 } else { if (y <= bank) { if (y == bank) { 4 } else { 3 } } else { 0 } }
	}
};

u8(i32, i32, i32) seeded_material = fn(x, y, z) {
	u64 ix = index_of(grid_local(x, 16));
	u64 iz = index_of(grid_local(z, 8));
	i32 height = sampled_height(x, z, ix, iz);
	if (y >= 3 && y <= 6 && y < height) {
		if (cache_passage[iz][ix] < 0) { cache_passage[iz][ix] = archipelago_passage(x, z, height); };
		archipelago_material(y, height, cache_passage[iz][ix])
	} else { archipelago_material(y, height, 0) }
};

u8(i32, i32, i32) sampled_material = fn(x, y, z) {
	if (cave_shelf_column(x, z)) { cave_shelf_material(x, y, z) } else {
		if (summit_column(x, z)) { summit_material(y, summit_floor(x, z)) } else {
			if (wreck_column(x, z)) { wreck_material(x, y, z) } else { seeded_material(x, y, z) }
		}
	}
};

struct copy TerrainEdit {
	i32 x;
	i32 y;
	i32 z;
	i32 epoch;
	u8 material;
}

TerrainEdit blank_edit = { .x = 0; .y = -1; .z = 0; .epoch = 0; .material = 0; };
TerrainEdit[16] blank_edit_row = [
	blank_edit, blank_edit, blank_edit, blank_edit, blank_edit, blank_edit, blank_edit, blank_edit,
	blank_edit, blank_edit, blank_edit, blank_edit, blank_edit, blank_edit, blank_edit, blank_edit
];
TerrainEdit[16][16] blank_edit_page = [
	blank_edit_row, blank_edit_row, blank_edit_row, blank_edit_row,
	blank_edit_row, blank_edit_row, blank_edit_row, blank_edit_row,
	blank_edit_row, blank_edit_row, blank_edit_row, blank_edit_row,
	blank_edit_row, blank_edit_row, blank_edit_row, blank_edit_row
];
TerrainEdit[16][16][8] empty_terrain_edits = [
	blank_edit_page, blank_edit_page, blank_edit_page, blank_edit_page,
	blank_edit_page, blank_edit_page, blank_edit_page, blank_edit_page
];
TerrainEdit[16][16][8] terrain_edits = empty_terrain_edits;

i32 edit_epoch = 1;
i32 exterior_edits = 0;
i32[16] blank_edit_hint = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
i32[16][16] edit_hints = [
	blank_edit_hint, blank_edit_hint, blank_edit_hint, blank_edit_hint,
	blank_edit_hint, blank_edit_hint, blank_edit_hint, blank_edit_hint,
	blank_edit_hint, blank_edit_hint, blank_edit_hint, blank_edit_hint,
	blank_edit_hint, blank_edit_hint, blank_edit_hint, blank_edit_hint
];

bool(i32, i32, i32) editable_exterior = fn(x, y, z) {
	y >= 0 && y < 16 && adventure_column(x, z) && !inside(x, y, z)
};

i32(i32, i32) exterior_hint = fn(x, z) { (x * 101 ^ z * 173 ^ (x >> 3) ^ (z >> 1)) & 255 };

bool(i32, i32) exterior_maybe_edited = fn(x, z) {
	if (exterior_edits == 0) { false } else {
		i32 hint = exterior_hint(x, z);
		edit_hints[index_of(hint / 16)][index_of(hint % 16)] == edit_epoch
	}
};

i32(i32, i32, i32) exterior_home = fn(x, y, z) {
	((x * 2531011) ^ (z * 1752193) ^ (y * 2654439) ^ (x >> 5) ^ (z >> 2)) & 2047
};

i32(i32, i32, i32, i32, i32, i32) find_exterior_edit = fn(x, y, z, slot, remaining, free) {
	if (remaining == 0) { free } else {
		u64 page = index_of(slot / 256);
		u64 row = index_of((slot / 16) % 16);
		u64 col = index_of(slot % 16);
		if (terrain_edits[page][row][col].epoch != edit_epoch) {
			if (free >= 0) { free } else { slot }
		} else {
			i32 old_y = terrain_edits[page][row][col].y;
			if (old_y == y && terrain_edits[page][row][col].x == x && terrain_edits[page][row][col].z == z) {
				slot
			} else {
				i32 candidate = if (old_y < 0 && free < 0) { slot } else { free };
				find_exterior_edit(x, y, z, (slot + 1) & 2047, remaining - 1, candidate)
			}
		}
	}
};

i32(i32, i32, i32) read_exterior_edit = fn(x, y, z) {
	i32 slot = find_exterior_edit(x, y, z, exterior_home(x, y, z), 24, -1);
	if (slot < 0) { -1 } else {
		u64 page = index_of(slot / 256);
		u64 row = index_of((slot / 16) % 16);
		u64 col = index_of(slot % 16);
		if (terrain_edits[page][row][col].epoch == edit_epoch && terrain_edits[page][row][col].y >= 0) {
			core.int_extend<i32>(terrain_edits[page][row][col].material)
		} else { -1 }
	}
};

u8(i32, i32, i32) exterior_cell = fn(x, y, z) {
	i32 result = if (exterior_maybe_edited(x, z)) { read_exterior_edit(x, y, z) } else { -1 };
	if (result < 0) { sampled_material(x, y, z) } else { core.int_trunc<u8>(result) }
};

i32(i32, i32, i32, i32) store_exterior_edit = fn(x, y, z, material) {
	i32 slot = find_exterior_edit(x, y, z, exterior_home(x, y, z), 24, -1);
	if (slot < 0) { -7 } else {
		u64 page = index_of(slot / 256);
		u64 row = index_of((slot / 16) % 16);
		u64 col = index_of(slot % 16);
		bool occupied = terrain_edits[page][row][col].epoch == edit_epoch && terrain_edits[page][row][col].y >= 0;
		u8 next = core.int_trunc<u8>(material);
		if (next == sampled_material(x, y, z)) {
			if (occupied) {
				terrain_edits[page][row][col].y = -1;
				exterior_edits = exterior_edits - 1;
			};
		} else {
			terrain_edits[page][row][col].x = x;
			terrain_edits[page][row][col].y = y;
			terrain_edits[page][row][col].z = z;
			terrain_edits[page][row][col].material = next;
			terrain_edits[page][row][col].epoch = edit_epoch;
			i32 hint = exterior_hint(x, z);
			edit_hints[index_of(hint / 16)][index_of(hint % 16)] = edit_epoch;
			if (!occupied) { exterior_edits = exterior_edits + 1; };
		};
		target_dirty = true;
		ground_contact_dirty = true;
		rebuild_near(x, z);
		1
	}
};

i32(i32, i32, i32, i32) edit_exterior = fn(x, y, z, material) {
	if (beacon_phase != BeaconPhase::active || material < 0 || material > 6) { -4 } else {
		u8 current = exterior_cell(x, y, z);
		if ((material == 0 && current != 0) || (material > 0 && current == 0)) {
			store_exterior_edit(x, y, z, material)
		} else { 0 }
	}
};

u8(i32, i32, i32) cell = fn(x, y, z) {
	if (y < 0 || y >= 16) { 0 } else {
		if (inside(x, y, z)) { world[index_of(y)][index_of(z)][index_of(x)] } else {
			if (adventure_column(x, z)) { exterior_cell(x, y, z) } else { 0 }
		}
	}
};

i32(i32, i32, i32) terrain_material = fn(x, y, z) { core.int_extend<i32>(cell(x, y, z)) };

f32(f32) absolute_f = fn(value) { if (value < 0.0) { 0.0 - value } else { value } };

i32(i32) abs_i = fn(value) {
	if (value < 0) { -value } else { value }
};

i32(i32, i32, i32) sample_pattern = fn(x, z, seed) {
	i32 residue = (x * 41 + z * 67 + (seed + 16381) * 97 + x * z * 13) % 251;
	(residue * residue * 11 + residue * 79 + x * 17 + z * 37) % 251
};

i32(i32, i32, i32, i32) terrain_pattern = fn(x, z, seed, offset) {
	i32 turn = (seed + 16381) / 251;
	i32 opening_turn = (default_seed() + 16381) / 251;
	i32 high_bits = (turn + 251 - opening_turn) % 251;
	i32 weight = 1 + x * 17 + z * 43 + x * z * 29;
	i32 mix = (high_bits * weight) % 251;
	sample_pattern(x, z, seed + offset + mix)
};

i32(i32, i32, i32, i32, i32) slope_noise = fn(x, z, seed, offset, span) {
	i32 ix = x / span;
	i32 iz = z / span;
	i32 dx = x % span;
	i32 dz = z % span;
	i32 near = terrain_pattern(ix, iz, seed, offset) * (span - dx) + terrain_pattern(ix + 1, iz, seed, offset) * dx;
	i32 far = terrain_pattern(ix, iz + 1, seed, offset) * (span - dx) + terrain_pattern(ix + 1, iz + 1, seed, offset) * dx;
	(near * (span - dz) + far * dz) / (span * span)
};

i32(i32, i32, i32) region_height = fn(x, z, seed) {
	i32 wide = slope_noise(x, z, seed, 0, 7);
	i32 small = slope_noise(x, z, seed, 379, 3);
	4 + (wide * 3 + small) / 155
};

i32(i32, i32, i32) height_at = fn(x, z, seed) {
	i32 edge_x = if (x < 8) { 8 - x } else { if (x > 14) { x - 14 } else { 0 } };
	i32 edge_z = if (z < 12) { 12 - z } else { if (z > 17) { z - 17 } else { 0 } };
	i32 edge = if (edge_x > edge_z) { edge_x } else { edge_z };
	if (edge == 0) { region_height(12, 16, seed) } else {
		i32 base = region_height(x, z, seed);
		if (edge < 3) { (region_height(12, 16, seed) * (3 - edge) + base * edge) / 3 } else { base }
	}
};

i32(i32, i32) min_i = fn(a, b) { if (a < b) { a } else { b } };
i32(i32, i32) max_i = fn(a, b) { if (a > b) { a } else { b } };

i32(i32, i32, i32) coastal_height = fn(x, z, seed) {
	i32 d = min_i(min_i(x, 47 - x), min_i(z, 47 - z));
	if (d < 3) { d } else { min_i(height_at(x, z, seed), d) }
};

bool(i32, i32, i32, i32) has_tree = fn(x, z, seed, height) {
	if ((x == 8 && z == 8) || (x == 5 && z == 11)) { true } else {
		if (x < 2 || x > 45 || z < 2 || z > 45 || height < 5 || (x >= 5 && x <= 16 && z >= 9 && z <= 19)) { false } else {
			i32 grove_x = x / 5;
			i32 grove_z = z / 5;
			i32 near_x = 1 + terrain_pattern(grove_x, grove_z, seed, 75) % 3;
			i32 near_z = 1 + terrain_pattern(grove_z, grove_x, seed, 119) % 3;
			x % 5 == near_x && z % 5 == near_z
		}
	}
};

u8(i32, i32, bool, bool) terrain = fn(y, height, tree, sandy) {
	if (y == height) { if (sandy) { 4 } else { 1 } } else {
		if (y < height) {
			if (y >= height - 2) { if (sandy) { 4 } else { 2 } } else { 3 }
		} else {
			if (tree && y <= height + 3) { 5 } else { 0 }
		}
	}
};

unit(i32, i32, i32, i32, bool, bool) fill_column = fn(x, y, z, height, tree, sandy) {
	if (y >= 16) { } else {
		world[index_of(y)][index_of(z)][index_of(x)] = terrain(y, height, tree, sandy);
		fill_column(x, y + 1, z, height, tree, sandy)
	}
};

unit(i32, i32, i32) fill_row = fn(x, z, seed) {
	if (x >= 48) { } else {
		i32 height = coastal_height(x, z, seed);
		bool sandy = height <= 2 || (height <= 5 && terrain_pattern(x / 3, z / 3, seed, 204) % 4 == 0);
		fill_column(x, 0, z, height, has_tree(x, z, seed, height), sandy);
		fill_row(x + 1, z, seed)
	}
};

unit(i32, i32) fill_terrain = fn(z, seed) {
	if (z >= 48) { } else {
		fill_row(0, z, seed);
		fill_terrain(z + 1, seed)
	}
};

unit(i32, i32, i32, i32, i32, bool) crown_line = fn(x, y, z, dx, radius, trim) {
	if (dx <= radius) {
		if ((!trim || abs_i(dx) < radius) && inside(x + dx, y, z) && cell(x + dx, y, z) == 0) {
			world[index_of(y)][index_of(z)][index_of(x + dx)] = 6;
		};
		crown_line(x, y, z, dx + 1, radius, trim);
	};
};

unit(i32, i32, i32, i32, i32, bool) crown_layer = fn(x, y, z, dz, radius, trim) {
	if (dz <= radius) {
		crown_line(x, y, z + dz, -radius, radius, trim && abs_i(dz) == radius);
		crown_layer(x, y, z, dz + 1, radius, trim);
	};
};

unit(i32, i32, i32) leaf_row = fn(x, z, seed) {
	if (x >= 48) { } else {
		i32 height = coastal_height(x, z, seed);
		if (has_tree(x, z, seed, height)) {
			crown_layer(x, height + 3, z, -2, 2, true);
			crown_layer(x, height + 4, z, -1, 1, false);
			crown_layer(x, height + 5, z, -1, 1, true);
		};
		leaf_row(x + 1, z, seed)
	}
};

unit(i32, i32) fill_leaves = fn(z, seed) {
	if (z >= 48) { } else {
		leaf_row(0, z, seed);
		fill_leaves(z + 1, seed)
	}
};

unit(i32, i32, i32) write_texel = fn(x, y, tile) {
	i32 speckle = sample_pattern(x, y, tile * 197) % 23 - 11;
	i32 cluster = sample_pattern(x / 3, y / 3, tile * 233) % 25 - 12;
	i32 mark = if ((x * 5 + y * 3 + x * y) % 23 == 0) { 12 } else { 0 };
	i32 noise = speckle + cluster;
	i32 red = 0;
	i32 green = 0;
	i32 blue = 0;
	bool grass = tile == 0 || (tile == 1 && y >= 11 + sample_pattern(x, 0, 55) % 4);
	if (grass) {
		red = 100 + noise + mark;
		green = 157 + noise + mark;
		blue = 55 + noise / 2;
	} else {
		if (tile <= 2) {
			red = 134 + noise;
			green = 92 + noise / 2;
			blue = 57 + noise / 2;
		};
		if (tile == 3) {
			i32 seam = if ((x + y / 4) % 8 == 0 && y % 6 < 4) { -20 } else { 0 };
			i32 strata = (y + x / 5 + sample_pattern(x / 5, y / 4, 127) % 2) % 7;
			i32 band = if (strata == 0) { -19 } else { if (strata == 1) { 13 } else { 0 } };
			red = 120 + noise + seam + band;
			green = 134 + noise + seam + band;
			blue = 141 + noise + seam + band;
		};
		if (tile == 4) {
			i32 ripple = (y + x / 4 + (x * x) / 31) % 6;
			i32 bank = if (ripple == 0) { -14 } else { if (ripple == 1) { 9 } else { 0 } };
			red = 216 + noise / 2 + bank;
			green = 190 + noise / 2 + bank + mark;
			blue = 136 + noise / 2 + bank / 2;
		};
		if (tile == 5) {
			i32 groove = if ((x + sample_pattern(x / 2, 0, 517) % 5) % 4 == 0) { -24 } else { 0 };
			red = 144 + noise + groove;
			green = 100 + noise + groove;
			blue = 57 + noise / 2 + groove;
		};
		if (tile == 6) {
			i32 dx = abs_i(2 * x - 15);
			i32 dy = abs_i(2 * y - 15);
			i32 ring = if (dx > dy) { dx } else { dy };
			i32 grain = if (ring % 6 == 1) { -32 } else { 0 };
			red = 196 + speckle + grain;
			green = 151 + speckle + grain;
			blue = 88 + speckle + grain;
		};
		if (tile == 7) {
			red = 62 + noise + mark;
			green = 122 + noise * 2 + mark;
			blue = 64 + noise / 2;
		};
	};
	u64 ay = index_of(y);
	u64 at = index_of(tile);
	u64 ax = index_of(x);
	block_atlas[ay][at][ax][0] = core.int_trunc<u8>(red);
	block_atlas[ay][at][ax][1] = core.int_trunc<u8>(green);
	block_atlas[ay][at][ax][2] = core.int_trunc<u8>(blue);
	block_atlas[ay][at][ax][3] = 255;
};

unit(i32, i32, i32) atlas_pixels = fn(x, y, tile) {
	if (x < 16) { write_texel(x, y, tile); atlas_pixels(x + 1, y, tile); };
};

unit(i32, i32) atlas_tiles = fn(y, tile) {
	if (tile < 8) { atlas_pixels(0, y, tile); atlas_tiles(y, tile + 1); };
};

unit(i32) atlas_scan = fn(y) {
	if (y < 16) { atlas_tiles(y, 0); atlas_scan(y + 1); };
};

unit() prepare_atlas = fn {
	if (!atlas_ready) {
		atlas_scan(0);
		unsafe { host.atlas(core.pointer_cast<*?u8>(&?block_atlas[0][0][0][0]), 128, 16); };
		atlas_ready = true;
	};
};

i32(u8, i32) face_tile = fn(material, side) {
	if (material == 1) {
		if (side == 3) { 0 } else { if (side == 2) { 2 } else { 1 } }
	} else {
		if (material == 2) { 2 } else {
			if (material == 3) { 3 } else {
				if (material == 4) { 4 } else {
					if (material == 5) { if (side == 2 || side == 3) { 6 } else { 5 } } else { 7 }
				}
			}
		}
	}
};

unit(f32, f32, f32, f32, f32, f32) vertex = fn(x, y, z, u, v, light) {
	i32 at = write_position;
	u64 outer = index_of(at / 13824);
	u64 layer = index_of(at / 576 % 24);
	u64 row = index_of(at / 24 % 24);
	u64 col = index_of(at % 24);
	vertices[outer][layer][row][col][0] = x;
	vertices[outer][layer][row][col][1] = y;
	vertices[outer][layer][row][col][2] = z;
	vertices[outer][layer][row][col][3] = u;
	vertices[outer][layer][row][col][4] = v;
	vertices[outer][layer][row][col][5] = light;
	write_position = at + 1;
};

unit(f32, f32, f32, f32, i32, u8) box_face = fn(x, y, z, size, side, material) {
	f32 east = x + size;
	f32 top = y + size;
	f32 south = z + size;
	f32 tile = core.sint_to_float<f32>(face_tile(material, side));
	f32 u0 = tile * 0.125 + 0.00390625;
	f32 u1 = tile * 0.125 + 0.12109375;
	f32 v0 = 0.03125;
	f32 v1 = 0.96875;
	f32 light = if (material == 7) { 1.18 } else {
		if (material == 8) { 1.85 } else {
			if (material == 9) { 1.31 } else {
				if (material == 10) { 1.45 } else {
					if (material == 11) { 1.64 } else {
						if (side == 3) { 1.00 } else { if (side == 2) { 0.57 } else { if (side < 2) { 0.79 } else { 0.89 } } }
					}
				}
			}
		}
	};
	if (side == 0) {
		vertex(x, y, z, u0, v0, light);
		vertex(x, y, south, u1, v0, light);
		vertex(x, top, south, u1, v1, light);
		vertex(x, y, z, u0, v0, light);
		vertex(x, top, south, u1, v1, light);
		vertex(x, top, z, u0, v1, light);
	};
	if (side == 1) {
		vertex(east, y, south, u0, v0, light);
		vertex(east, y, z, u1, v0, light);
		vertex(east, top, z, u1, v1, light);
		vertex(east, y, south, u0, v0, light);
		vertex(east, top, z, u1, v1, light);
		vertex(east, top, south, u0, v1, light);
	};
	if (side == 2) {
		vertex(x, y, south, u0, v0, light);
		vertex(x, y, z, u1, v0, light);
		vertex(east, y, z, u1, v1, light);
		vertex(x, y, south, u0, v0, light);
		vertex(east, y, z, u1, v1, light);
		vertex(east, y, south, u0, v1, light);
	};
	if (side == 3) {
		vertex(x, top, z, u0, v0, light);
		vertex(x, top, south, u1, v0, light);
		vertex(east, top, south, u1, v1, light);
		vertex(x, top, z, u0, v0, light);
		vertex(east, top, south, u1, v1, light);
		vertex(east, top, z, u0, v1, light);
	};
	if (side == 4) {
		vertex(east, y, z, u0, v0, light);
		vertex(x, y, z, u1, v0, light);
		vertex(x, top, z, u1, v1, light);
		vertex(east, y, z, u0, v0, light);
		vertex(x, top, z, u1, v1, light);
		vertex(east, top, z, u0, v1, light);
	};
	if (side == 5) {
		vertex(x, y, south, u0, v0, light);
		vertex(east, y, south, u1, v0, light);
		vertex(east, top, south, u1, v1, light);
		vertex(x, y, south, u0, v0, light);
		vertex(east, top, south, u1, v1, light);
		vertex(x, top, south, u0, v1, light);
	};
};

unit(i32, i32, i32, i32, u8) face = fn(ix, iy, iz, side, material) {
	box_face(core.sint_to_float<f32>(ix), core.sint_to_float<f32>(iy), core.sint_to_float<f32>(iz), 1.0, side, material);
};

CellPosition(i32, i32, i32) cell_position = fn(x, y, z) {
	CellPosition pos = { .x = x; .y = y; .z = z; };
	pos
};

bool(CellPosition, CellPosition) same_position = fn(a, b) {
	a.x == b.x && a.y == b.y && a.z == b.z
};

i32(RayHit) legacy_hit = fn(hit) {
	CellPosition pos = hit.position;
	if (hit.face < 0 || pos.x < 0 || pos.x >= 128 || pos.y < 0 || pos.y >= 16 || pos.z < 0 || pos.z >= 128) { -1 } else {
		pos.x % 64 + pos.y * 64 + (pos.z % 64) * 1024 + hit.face * 65536 + (pos.x / 64) * 524288 + (pos.z / 64) * 1048576
	}
};

i32(i32) chunk_axis = fn(value) {
	grid_axis(value, 12)
};

i32(i32) chunk_local = fn(value) {
	grid_local(value, 12)
};

f32() loose_cube_size = fn { 0.24 };

f32(i32) loose_cube_side = fn(cell_axis) { core.sint_to_float<f32>(cell_axis) + 0.38 };

f32(i32) loose_cube_base = fn(cell_height) { core.sint_to_float<f32>(cell_height) + 0.02 };

unit(f32, f32, f32, i32) draw_loose_cube = fn(x, y, z, side) {
	if (side < 6) { box_face(x, y, z, loose_cube_size(), side, 5); draw_loose_cube(x, y, z, side + 1); };
};

unit(i32, i32, i32) mesh_loose = fn(at, chunk_x, chunk_z) {
	if (at < loose_count) {
		u64 slot = index_of(at);
		i32 x = loose_x[slot];
		i32 z = loose_z[slot];
		if (chunk_axis(x) == chunk_x && chunk_axis(z) == chunk_z) {
			draw_loose_cube(loose_cube_side(x), loose_cube_base(loose_y[slot]), loose_cube_side(z), 0);
		};
		mesh_loose(at + 1, chunk_x, chunk_z);
	};
};

u8[14] blank_halo_row = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
u8[14][14] blank_halo_layer = [
	blank_halo_row, blank_halo_row, blank_halo_row, blank_halo_row, blank_halo_row, blank_halo_row, blank_halo_row,
	blank_halo_row, blank_halo_row, blank_halo_row, blank_halo_row, blank_halo_row, blank_halo_row, blank_halo_row
];
u8[14][14][16] mesh_halo = [
	blank_halo_layer, blank_halo_layer, blank_halo_layer, blank_halo_layer,
	blank_halo_layer, blank_halo_layer, blank_halo_layer, blank_halo_layer,
	blank_halo_layer, blank_halo_layer, blank_halo_layer, blank_halo_layer,
	blank_halo_layer, blank_halo_layer, blank_halo_layer, blank_halo_layer
];

unit(u64, u64, u64, i32, i32) fill_halo_procedural = fn(lx, lz, y, height, passage) {
	if (y < 16) {
		mesh_halo[y][lz][lx] = archipelago_material(core.int_trunc<i32>(y), height, passage);
		fill_halo_procedural(lx, lz, y + 1, height, passage);
	};
};

unit(u64, u64, u64, i32, i32) fill_halo_regular = fn(lx, lz, y, x, z) {
	if (y < 16) {
		mesh_halo[y][lz][lx] = cell(x, core.int_trunc<i32>(y), z);
		fill_halo_regular(lx, lz, y + 1, x, z);
	};
};

unit(u64, u64, u64, i32, i32) overlay_halo_column = fn(lx, lz, y, x, z) {
	if (y < 16) {
		i32 altitude = core.int_trunc<i32>(y);
		i32 override_material = read_exterior_edit(x, altitude, z);
		if (override_material >= 0) { mesh_halo[y][lz][lx] = core.int_trunc<u8>(override_material); };
		overlay_halo_column(lx, lz, y + 1, x, z);
	};
};

unit(u64, u64, u64, i32, i32) fill_halo_cave_shelf = fn(lx, lz, y, x, z) {
	if (y < 16) {
		i32 altitude = core.int_trunc<i32>(y);
		mesh_halo[y][lz][lx] = cave_shelf_material(x, altitude, z);
		fill_halo_cave_shelf(lx, lz, y + 1, x, z);
	};
};

unit(u64, u64, u64, i32) fill_halo_summit = fn(lx, lz, y, floor) {
	if (y < 16) {
		i32 altitude = core.int_trunc<i32>(y);
		mesh_halo[y][lz][lx] = summit_material(altitude, floor);
		fill_halo_summit(lx, lz, y + 1, floor);
	};
};

unit(u64, u64, u64, i32, i32) fill_halo_wreck = fn(lx, lz, y, x, z) {
	if (y < 16) {
		i32 altitude = core.int_trunc<i32>(y);
		mesh_halo[y][lz][lx] = wreck_material(x, altitude, z);
		fill_halo_wreck(lx, lz, y + 1, x, z);
	};
};

unit(i32, i32, i32, i32) fill_halo_row = fn(lx, lz, start_x, z) {
	if (lx < 14) {
		i32 x = start_x + lx - 1;
		if (adventure_column(x, z) && !inside(x, 0, z)) {
			if (cave_shelf_column(x, z)) {
				fill_halo_cave_shelf(index_of(lx), index_of(lz), 0, x, z);
			} else {
				if (summit_column(x, z)) {
					fill_halo_summit(index_of(lx), index_of(lz), 0, summit_floor(x, z));
				} else {
					if (wreck_column(x, z)) {
						fill_halo_wreck(index_of(lx), index_of(lz), 0, x, z);
					} else {
						i32 height = archipelago_height(x, z);
						fill_halo_procedural(index_of(lx), index_of(lz), 0, height, archipelago_passage(x, z, height));
					};
				};
			};
			if (exterior_maybe_edited(x, z)) { overlay_halo_column(index_of(lx), index_of(lz), 0, x, z); };
		} else {
			fill_halo_regular(index_of(lx), index_of(lz), 0, x, z);
		};
		fill_halo_row(lx + 1, lz, start_x, z);
	};
};

unit(i32, i32, i32) fill_halo = fn(lz, start_x, start_z) {
	if (lz < 14) {
		fill_halo_row(0, lz, start_x, start_z + lz - 1);
		fill_halo(lz + 1, start_x, start_z);
	};
};

unit(i32, i32, i32, i32, i32) mesh_row = fn(lx, y, lz, start_x, start_z) {
	if (lx <= 12) {
		u64 ix = index_of(lx);
		u64 iy = index_of(y);
		u64 iz = index_of(lz);
		u8 material = mesh_halo[iy][iz][ix];
		if (material != 0) {
			i32 x = start_x + lx - 1;
			i32 z = start_z + lz - 1;
			if (mesh_halo[iy][iz][ix - 1] == 0) { face(x, y, z, 0, material); };
			if (mesh_halo[iy][iz][ix + 1] == 0) { face(x, y, z, 1, material); };
			if (y == 0 || mesh_halo[iy - 1][iz][ix] == 0) { face(x, y, z, 2, material); };
			if (y == 15 || mesh_halo[iy + 1][iz][ix] == 0) { face(x, y, z, 3, material); };
			if (mesh_halo[iy][iz - 1][ix] == 0) { face(x, y, z, 4, material); };
			if (mesh_halo[iy][iz + 1][ix] == 0) { face(x, y, z, 5, material); };
		};
		mesh_row(lx + 1, y, lz, start_x, start_z);
	};
};

unit(i32, i32, i32, i32) mesh_layer = fn(y, lz, start_x, start_z) {
	if (lz <= 12) {
		mesh_row(1, y, lz, start_x, start_z);
		mesh_layer(y, lz + 1, start_x, start_z);
	};
};

unit(i32, i32, i32) mesh_cells = fn(y, start_x, start_z) {
	if (y < 16) {
		mesh_layer(y, 1, start_x, start_z);
		mesh_cells(y + 1, start_x, start_z);
	};
};

f32(i32) lighthouse_part_surface = fn(part) {
	if (part == 1) { 13.0 } else { if (part == 2) { 6.0 } else { 5.0 } }
};

unit(f32, f32, f32, f32, i32, u8) collectible_cube_faces = fn(x, y, z, size, side, material) {
	if (side < 6) {
		box_face(x, y, z, size, side, material);
		collectible_cube_faces(x, y, z, size, side + 1, material);
	};
};

unit(f32, f32, f32, f32, u8) collectible_cube = fn(x, y, z, size, material) {
	f32 half = size * 0.5;
	collectible_cube_faces(x - half, y, z - half, size, 0, material);
};

unit(i32, f32, f32, f32) mesh_lighthouse_part = fn(part, x, y, z) {
	if (part == 0) {
		collectible_cube(x, y + 0.02, z, 0.36, 3);
		collectible_cube(x, y + 0.32, z, 0.46, 9);
		collectible_cube(x - 0.29, y + 0.43, z, 0.17, 3);
		collectible_cube(x + 0.29, y + 0.43, z, 0.17, 3);
	} else {
		if (part == 1) {
			collectible_cube(x, y + 0.02, z, 0.43, 5);
			collectible_cube(x, y + 0.30, z, 0.38, 10);
			collectible_cube(x, y + 0.47, z - 0.29, 0.25, 10);
			collectible_cube(x, y + 0.47, z + 0.29, 0.25, 10);
		} else {
			collectible_cube(x, y + 0.02, z, 0.32, 5);
			collectible_cube(x, y + 0.23, z, 0.26, 11);
			collectible_cube(x, y + 0.43, z, 0.33, 11);
			collectible_cube(x - 0.19, y + 0.67, z, 0.15, 11);
			collectible_cube(x + 0.19, y + 0.67, z, 0.15, 11);
		};
	};
};

unit(i32, i32, i32) mesh_lighthouse_parts = fn(part, chunk_x, chunk_z) {
	if (part < 3) {
		if ((lighthouse_parts & (1 << part)) == 0) {
			f32 x = lighthouse_part_x(part);
			f32 z = lighthouse_part_z(part);
			if (chunk_axis(floor_i(x)) == chunk_x && chunk_axis(floor_i(z)) == chunk_z) {
				mesh_lighthouse_part(part, x, lighthouse_part_surface(part), z);
			};
		};
		mesh_lighthouse_parts(part + 1, chunk_x, chunk_z);
	};
};

i32(i32, i32) rebuild_chunk = fn(chunk_x, chunk_z) {
	write_position = 0;
	fill_halo(0, chunk_x * 12, chunk_z * 12);
	mesh_cells(0, chunk_x * 12, chunk_z * 12);
	if (loose_count > 0) { mesh_loose(0, chunk_x, chunk_z); };
	if (archipelago_hunt) { mesh_lighthouse_parts(0, chunk_x, chunk_z); };
	i32 count = write_position;
	unsafe { host.mesh(core.pointer_cast<*?u8>(&?vertices[0][0][0][0][0]), count, chunk_x, chunk_z); };
	count
};

i32(i32) rebuild_chunks = fn(chunk) {
	if (chunk < creative_columns() * creative_columns()) {
		i32 count = rebuild_chunk(chunk % creative_columns(), chunk / creative_columns());
		count + rebuild_chunks(chunk + 1)
	} else { 0 }
};

i32(i32, i32, i32) top_solid = fn(x, z, y) {
	if (y == 0 || cell(x, y, z) != 0) { y } else { top_solid(x, z, y - 1) }
};

i32(i32, i32) horizon_height = fn(x, z) {
	if (inside(x, 0, z)) { beacon_ground(x, z) } else {
		if (cave_shelf_column(x, z) || summit_column(x, z)) { top_solid(x, z, 15) } else {
			if (wreck_column(x, z)) { top_solid(x, z, 6) } else { archipelago_height(x, z) }
		}
	}
};

i32(i32, i32, i32) horizon_axis = fn(origin, i, step) { origin + i * step };

i32[33] blank_horizon_row = [
	0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
];
i32[33][33] horizon_heights = [
	blank_horizon_row, blank_horizon_row, blank_horizon_row, blank_horizon_row, blank_horizon_row, blank_horizon_row, blank_horizon_row, blank_horizon_row,
	blank_horizon_row, blank_horizon_row, blank_horizon_row, blank_horizon_row, blank_horizon_row, blank_horizon_row, blank_horizon_row, blank_horizon_row,
	blank_horizon_row, blank_horizon_row, blank_horizon_row, blank_horizon_row, blank_horizon_row, blank_horizon_row, blank_horizon_row, blank_horizon_row,
	blank_horizon_row, blank_horizon_row, blank_horizon_row, blank_horizon_row, blank_horizon_row, blank_horizon_row, blank_horizon_row, blank_horizon_row,
	blank_horizon_row
];

struct copy HorizonGrid {
	i32 x;
	i32 z;
	i32 count;
	i32 step;
	i32 offset;
}

unit(i32, i32, i32, HorizonGrid) sample_horizon_row = fn(ix, iz, z, grid) {
	if (ix <= grid.count) {
		i32 x = horizon_axis(grid.x, ix, grid.step) + grid.offset;
		i32 low = adventure_min();
		i32 high = adventure_max();
		horizon_heights[index_of(iz)][index_of(ix)] = if (x >= low && x < high && z >= low && z < high) {
			horizon_height(x, z)
		} else { 0 };
		sample_horizon_row(ix + 1, iz, z, grid);
	};
};

unit(i32, HorizonGrid) sample_horizon = fn(iz, grid) {
	if (iz <= grid.count) {
		sample_horizon_row(0, iz, horizon_axis(grid.z, iz, grid.step) + grid.offset, grid);
		sample_horizon(iz + 1, grid);
	};
};

i32 horizon_write = 0;

unit(i32, i32, i32, i32) horizon_vertex = fn(x, y, z, tile) {
	i32 at = horizon_write;
	u64 page = index_of(at / 576);
	u64 row = index_of((at / 24) % 24);
	u64 col = index_of(at % 24);
	f32 h = core.sint_to_float<f32>(y);
	f32 green = clamp_f((h - 4.0) * 0.34, 0.0, 1.0);
	f32 stone = clamp_f((h - 10.0) * 0.28, 0.0, 1.0);
	horizon_vertices[page][row][col][0] = core.sint_to_float<f32>(x);
	horizon_vertices[page][row][col][1] = h + 0.88;
	horizon_vertices[page][row][col][2] = core.sint_to_float<f32>(z);
	if (tile >= 0) {
		horizon_vertices[page][row][col][3] = core.sint_to_float<f32>(tile);
		horizon_vertices[page][row][col][4] = 0.0;
		horizon_vertices[page][row][col][5] = 2.0;
	} else {
		horizon_vertices[page][row][col][3] = 0.73 - green * 0.49 + stone * 0.19;
		horizon_vertices[page][row][col][4] = 0.61 + green * 0.01 - stone * 0.04;
		horizon_vertices[page][row][col][5] = 0.37 - green * 0.12 + stone * 0.22;
	};
	horizon_write = at + 1;
};

unit(i32, i32, i32, i32, i32, i32, i32, i32, i32) horizon_quad = fn(x, z, nx, nz, a, b, c, d, tile) {
	horizon_vertex(x, a, z, tile);
	horizon_vertex(x, c, nz, tile);
	horizon_vertex(nx, b, z, tile);
	horizon_vertex(nx, d, nz, tile);
	horizon_vertex(nx, b, z, tile);
	horizon_vertex(x, c, nz, tile);
};

unit(i32, i32, i32, i32, i32, i32, i32) horizon_cliff = fn(x, z, nx, nz, low, high, tile) {
	if (low < high) {
		horizon_vertex(x, low, z, tile);
		horizon_vertex(x, high, z, tile);
		horizon_vertex(nx, low, nz, tile);
		horizon_vertex(nx, high, nz, tile);
		horizon_vertex(nx, low, nz, tile);
		horizon_vertex(x, high, z, tile);
	};
};

unit(i32, i32, HorizonGrid) mesh_horizon_row = fn(ix, iz, grid) {
	if (ix < grid.count) {
		i32 x = horizon_axis(grid.x, ix, grid.step);
		i32 z = horizon_axis(grid.z, iz, grid.step);
		i32 nx = x + grid.step;
		i32 nz = z + grid.step;
		u64 ux = index_of(ix);
		u64 uz = index_of(iz);
		i32 a = horizon_heights[uz][ux];
		if (grid.offset == 0) {
			i32 b = horizon_heights[uz][ux + 1];
			i32 c = horizon_heights[uz + 1][ux];
			i32 d = horizon_heights[uz + 1][ux + 1];
			if (max_i(max_i(a, b), max_i(c, d)) >= 3) { horizon_quad(x, z, nx, nz, a, b, c, d, -1); };
		} else {
			if (a >= 3) {
				i32 near_tile = if (a >= 11) { 3 } else { if (a <= 4) { 4 } else { 0 } };
				i32 cliff_tile = if (a >= 9) { 3 } else { if (a <= 4) { 4 } else { 1 } };
				horizon_quad(x, z, nx, nz, a, a, a, a, near_tile);
				if (ix > 0) { horizon_cliff(x, z, x, nz, horizon_heights[uz][ux - 1], a, cliff_tile); };
				if (iz > 0) { horizon_cliff(nx, z, x, z, horizon_heights[uz - 1][ux], a, cliff_tile); };
				if (ix + 1 < grid.count) { horizon_cliff(nx, nz, nx, z, horizon_heights[uz][ux + 1], a, cliff_tile); };
				if (iz + 1 < grid.count) { horizon_cliff(x, nz, nx, nz, horizon_heights[uz + 1][ux], a, cliff_tile); };
			};
		};
		mesh_horizon_row(ix + 1, iz, grid);
	};
};

unit(i32, HorizonGrid) mesh_horizon = fn(iz, grid) {
	if (iz < grid.count) {
		mesh_horizon_row(0, iz, grid);
		mesh_horizon(iz + 1, grid);
	};
};

unit(i32, i32) rebuild_horizon = fn(x, z) {
	i32 center_x = x * 12 + 6;
	i32 center_z = z * 12 + 6;
	HorizonGrid far = { .x = center_x - 156; .z = center_z - 156; .count = 26; .step = 12; .offset = 0; };
	HorizonGrid mid = { .x = center_x - 42; .z = center_z - 42; .count = 20; .step = 4; .offset = 2; };
	horizon_write = 0;
	sample_horizon(0, far);
	mesh_horizon(0, far);
	sample_horizon(0, mid);
	mesh_horizon(0, mid);
	unsafe { host.horizon(core.pointer_cast<*?u8>(&?horizon_vertices[0][0][0][0]), horizon_write); };
};

i32(i32) stream_min = fn(center) { max_i(adventure_min() / 12, center - 2) };
i32(i32) stream_max = fn(center) { min_i(adventure_max() / 12 - 1, center + 2) };

bool(i32, i32) creative_chunk = fn(x, z) {
	x >= 0 && z >= 0 && x < creative_columns() && z < creative_columns()
};

bool(i32, i32, i32, i32, bool) terrain_resident = fn(x, z, center_x, center_z, is_adventure) {
	if (is_adventure) {
		x >= stream_min(center_x) && x <= stream_max(center_x) && z >= stream_min(center_z) && z <= stream_max(center_z)
	} else { creative_chunk(x, z) }
};

unit(i32, i32, i32, i32, i32, bool) retire_terrain_row = fn(x, z, east, next_x, next_z, keep_adventure) {
	if (x <= east) {
		if (!terrain_resident(x, z, next_x, next_z, keep_adventure)) {
			unsafe { host.mesh(core.pointer_cast<*?u8>(&?vertices[0][0][0][0][0]), 0, x, z); };
		};
		retire_terrain_row(x + 1, z, east, next_x, next_z, keep_adventure);
	};
};

unit(i32, i32, i32, i32, i32, i32, bool) retire_terrain = fn(z, west, east, south, next_x, next_z, keep_adventure) {
	if (z <= south) {
		retire_terrain_row(west, z, east, next_x, next_z, keep_adventure);
		retire_terrain(z + 1, west, east, south, next_x, next_z, keep_adventure);
	};
};

i32(i32, i32, i32, bool, i32, i32) enter_terrain_row = fn(x, z, east, force, old_x, old_z) {
	if (x <= east) {
		i32 count = if (force || !terrain_resident(x, z, old_x, old_z, true)) { rebuild_chunk(x, z) } else { 0 };
		count + enter_terrain_row(x + 1, z, east, force, old_x, old_z)
	} else { 0 }
};

i32(i32, i32, i32, i32, bool, i32, i32) enter_terrain = fn(z, west, east, south, force, old_x, old_z) {
	if (z <= south) {
		i32 count = enter_terrain_row(west, z, east, force, old_x, old_z);
		count + enter_terrain(z + 1, west, east, south, force, old_x, old_z)
	} else { 0 }
};

i32(f32) terrain_axis = fn(value) {
	i32 axis = chunk_axis(floor_i(value));
	max_i(adventure_min() / 12, min_i(adventure_max() / 12 - 1, axis))
};

i32(bool) sync_terrain = fn(force) {
	i32 x = terrain_axis(camera_pose.x);
	i32 z = terrain_axis(camera_pose.z);
	i32 old_x = terrain_chunk_x;
	i32 old_z = terrain_chunk_z;
	if (!force && terrain_window_active && x == old_x && z == old_z) { 0 } else {
		if (terrain_window_active) {
			retire_terrain(stream_min(old_z), stream_min(old_x), stream_max(old_x), stream_max(old_z), x, z, true);
		} else {
			retire_terrain(0, 0, creative_columns() - 1, creative_columns() - 1, x, z, true);
		};
		terrain_window_active = true;
		terrain_chunk_x = x;
		terrain_chunk_z = z;
		if (archipelago_hunt) { rebuild_horizon(x, z); } else {
			if (force) { unsafe { host.horizon(core.pointer_cast<*?u8>(&?horizon_vertices[0][0][0][0]), 0); }; };
		};
		enter_terrain(stream_min(z), stream_min(x), stream_max(x), stream_max(z), force, old_x, old_z)
	}
};

i32() rebuild = fn {
	if (beacon_phase == BeaconPhase::sandbox) {
		unsafe { host.horizon(core.pointer_cast<*?u8>(&?horizon_vertices[0][0][0][0]), 0); };
		if (terrain_window_active) {
			retire_terrain(stream_min(terrain_chunk_z), stream_min(terrain_chunk_x), stream_max(terrain_chunk_x), stream_max(terrain_chunk_z), 0, 0, false);
			terrain_window_active = false;
		};
		rebuild_chunks(0)
	} else {
		sync_terrain(true)
	}
};

unit(i32, i32) refresh_visible_terrain = fn(chunk_x, chunk_z) {
	if (terrain_resident(chunk_x, chunk_z, terrain_chunk_x, terrain_chunk_z, terrain_window_active)) {
		rebuild_chunk(chunk_x, chunk_z);
	};
};

unit(i32, i32) refresh_cell_owner = fn(x, z) {
	refresh_visible_terrain(chunk_axis(x), chunk_axis(z));
};

unit(i32, i32) rebuild_near = fn(x, z) {
	i32 cx = chunk_axis(x);
	i32 cz = chunk_axis(z);
	i32 lx = chunk_local(x);
	i32 lz = chunk_local(z);
	refresh_visible_terrain(cx, cz);
	if (lx == 0) { refresh_visible_terrain(cx - 1, cz); };
	if (lx == 11) { refresh_visible_terrain(cx + 1, cz); };
	if (lz == 0) { refresh_visible_terrain(cx, cz - 1); };
	if (lz == 11) { refresh_visible_terrain(cx, cz + 1); };
};

bool(i32, i32) coast_cave = fn(x, z) {
	x >= 30 && x <= 38 && z >= 9 && z <= 13
};

bool(i32, i32) cave_passage = fn(x, z) {
	coast_cave(x, z) && z >= 10 && z <= 12
};

i32(i32, i32) cave_ground = fn(x, z) {
	if (coast_cave(x, z)) {
		i32 from_mouth = min_i(x - 30, 38 - x);
		if (from_mouth >= 2 && z == 11) { 10 } else { if (from_mouth > 0) { 9 } else { 8 } }
	} else {
		4
	}
};

bool(i32, i32) outer_coast = fn(x, z) {
	x >= 44 || z >= 48
};

i32(i32, i32, i32, i32, i32, i32) tidal_bank = fn(x, z, west, east, north, south) {
	if (x < west || x > east || z < north || z > south) { 0 } else {
		i32 rim = min_i(min_i(x - west, east - x), min_i(z - north, south - z));
		min_i(7, 2 + rim / 2)
	}
};

bool(i32, i32) east_shelf = fn(x, z) {
	x >= 69 && x <= 84 && z >= 15 && z <= 22
};

i32(i32, i32) east_headland = fn(x, z) {
	if (x < 74 || x > 84 || z < 17 || z > 25) { -1 } else {
		i32 rib = min_i(x - 74, 84 - x);
		if (z >= 20 && z <= 22 && (x < 77 || x > 80)) { 4 } else {
			i32 crown = min_i(11, 5 + rib + (if (z >= 22) { 1 } else { 0 }));
			if (z == 17 || z == 25) { crown - 1 } else { crown }
		}
	}
};

i32(i32, i32) outer_ground = fn(x, z) {
	bool stepping_stone = (x >= 44 && x <= 46) || (x >= 48 && x <= 50)
		|| (x >= 52 && x <= 55) || (x >= 57 && x <= 60) || (x >= 62 && x <= 64);
	if (z >= 13 && z <= 16 && (stepping_stone || (x >= 65 && x <= 68))) { 4 } else {
		i32 east_bank = tidal_bank(x, z, 65, 86, 9, 27);
		i32 headland = east_headland(x, z);
		if (headland >= 0) { headland } else {
			if (east_shelf(x, z)) { 4 } else {
				if (east_bank > 0) { east_bank } else { tidal_bank(x, z, 63, 89, 61, 84) }
			}
		}
	}
};

u8(i32, i32, i32, i32) outer_tile = fn(x, y, z, ground) {
	if (archipelago_hunt && x >= 84 && x <= 88 && z >= 13 && z <= 16) {
		i32 shelf = 88 - x;
		if (y > shelf) { 0 } else { if (y == shelf) { 4 } else { 3 } }
	} else { eastern_shore_tile(x, y, z, ground) }
};

u8(i32, i32, i32, i32) eastern_shore_tile = fn(x, y, z, ground) {
	if (x == 67 && z == 14 && y >= 5 && y <= 7) { 5 } else {
		if (x >= 77 && x <= 80 && z >= 20 && z <= 22 && y >= 5 && y <= 7) { 0 } else {
			if (y == ground) {
				if (east_headland(x, z) > 4) { 3 } else { if (ground < 5) { 4 } else { 1 } }
			} else { if (y < ground) { 3 } else { 0 } }
		}
	}
};

i32(i32, i32) beacon_ground = fn(x, z) {
	if (outer_coast(x, z)) { outer_ground(x, z) } else {
		if (x >= 28 && x <= 41 && z >= 9 && z <= 13) { cave_ground(x, z) } else { beacon_shore(x, z) }
	}
};

i32(i32, i32) beacon_shore = fn(x, z) {
	i32 edge = min_i(min_i(x, 47 - x), min_i(z, 47 - z));
	i32 base = if (x >= 4 && x <= 43 && ((z >= 30 && z <= 45) || (z >= 3 && z <= 17))) { 4 } else { 0 };
	if (x >= 22 && x <= 26 && z >= 18 && z <= 29) {
		if ((z - 18) % 2 == 0) { 3 } else { 0 }
	} else {
		if (x >= 36 && x <= 40 && z >= 17 && z <= 29) {
			if (z >= 27 || z <= 19) { 4 } else {
				if (z >= 24 || z <= 21) { 5 } else { 6 }
			}
		} else {
			if (x >= 6 && x <= 10 && z >= 18 && z <= 29) {
				if (z >= 28 || z <= 19) { 3 } else { 2 }
			} else {
				if (x >= 21 && x <= 27 && z >= 3 && z <= 7) { 5 } else {
					if (base != 0 && (x > 29 && z <= 11 || x < 17 && z >= 34 || x >= 31 && z >= 37)) {
						min_i(4 + region_height(x, z, 761) / 3, edge + 2)
					} else { base }
				}
			}
		}
	}
};

bool(i32, i32, i32) soft_plug = fn(x, y, z) {
	x >= 7 && x <= 9 && z == 23 && (y == 3 || y == 4)
};

bool(i32, i32, i32) harbor_hut = fn(x, y, z) {
	x >= 27 && x <= 32 && y >= 5 && y <= 10 && z >= 38 && z <= 42
};

bool(i32, i32) watchfire_post = fn(x, z) {
	(x == 22 && z == 15) || (x == 7 && z == 8)
};

bool(i32, i32) lighthouse_lantern_bay = fn(x, z) {
	x >= 22 && x <= 26 && z >= 4 && z <= 5
};

bool(i32, i32) lighthouse_lantern_core = fn(x, z) {
	x >= 23 && x <= 25 && z >= 4 && z <= 5
};

bool(i32, i32, i32) mission_fixed_wood = fn(x, y, z) {
	(y == 5 && watchfire_post(x, z))
		|| (y == 13 && lighthouse_lantern_bay(x, z))
		|| (y == 14 && lighthouse_lantern_bay(x, z) && !lighthouse_lantern_core(x, z))
};

bool(i32, i32) mission_tree = fn(x, z) {
	(x >= 31 && z >= 37 || x < 17 && z >= 34 || x > 29 && z <= 11)
		&& x >= 5 && x <= 42 && z >= 5 && z <= 44
		&& x % 5 == 1 + terrain_pattern(x / 5, z / 5, 761, 75) % 3
		&& z % 5 == 1 + terrain_pattern(z / 5, x / 5, 761, 119) % 3
};

u8(i32, i32, i32) harbor_structure = fn(x, y, z) {
	bool door = x == 27 && z == 40 && y <= 6;
	bool window = x == 29 && (z == 38 || z == 42) && y == 7;
	bool wall = x == 27 || x == 32 || z == 38 || z == 42;
	if (y == 10) {
		if (x >= 29 && x <= 30) { 5 } else { 0 }
	} else {
		if (y == 9) {
			if (x >= 28 && x <= 31) { 5 } else { 0 }
		} else {
			if (y == 8) { 5 } else { if (wall && !door && !window) { if (y == 5) { 3 } else { 5 } } else { 0 } }
		}
	}
};

CellPosition guide_timber = { .x = 23; .y = 5; .z = 40; };

CellPosition guide_crossing = { .x = 24; .y = 4; .z = 28; };

bool(i32, i32, i32) crossing_plank = fn(x, y, z) {
	x >= 22 && x <= 26 && y == 4 && z >= 18 && z <= 29
};

u8(i32, i32, i32, i32) beacon_tile = fn(x, y, z, ground) {
	if (archipelago_hunt && x <= 3 && z >= 31 && z <= 35) {
		i32 floor = min_i(4, 2 + x);
		if (y > floor) { 0 } else { if (y == floor) { 4 } else { 3 } }
	} else {
		if (y == guide_timber.y && x == guide_timber.x && z == guide_timber.z) { 5 } else { beacon_features(x, y, z, ground) }
	}
};

u8(i32, i32, i32, i32) beacon_features = fn(x, y, z, ground) {
	bool tower = x >= 21 && x <= 27 && z >= 3 && z <= 6;
	bool on_coast_trail = z == 9 && x >= 8 && x <= 24;
	bool harbor_steps = (x == 24 && z >= 32 && z <= 45) || (z == 33 && x >= 8 && x <= 38);
	if (harbor_hut(x, y, z)) { harbor_structure(x, y, z) } else {
		if (tower && y >= 6 && y <= 14) {
			if (y == 14 && lighthouse_lantern_core(x, z)) { 7 } else {
				if (y >= 12) {
					if (lighthouse_lantern_bay(x, z)) { if (y == 12) { 3 } else { 5 } } else { 0 }
				} else {
					bool door = x >= 23 && x <= 25 && z == 6 && y <= 8;
					bool window = (x == 21 || x == 27) && z == 5 && y == 10;
					bool wall = x == 21 || x == 27 || z == 3 || z == 6;
					if ((wall && !door && !window) || y == 11) { if (y == 9 || y == 11) { 4 } else { 3 } } else { 0 }
				}
			}
		} else {
			if ((y == 5 || y == 6) && watchfire_post(x, z)) { if (y == 5) { 5 } else { 7 } } else {
				if (cave_passage(x, z) && y >= 5 && y <= 7) { 0 } else {
					if (soft_plug(x, y, z)) { 4 } else {
						bool cut_wall = (x == 6 || x == 10) && z >= 22 && z <= 24 && (y == 3 || y == 4);
						bool cut_top = x >= 6 && x <= 10 && z >= 22 && z <= 24 && y == 5;
						if (cut_wall || cut_top) { 3 } else {
							if (y > ground) {
								if (ground >= 5 && y <= ground + 3 && mission_tree(x, z)) { 5 } else { 0 }
							} else {
								if (y == ground) {
									bool harbor_path = harbor_steps || on_coast_trail;
									bool ridge = x >= 36 && x <= 40 && z >= 17 && z <= 29;
									if (y <= 3 || tower || harbor_path) { 4 } else { if (ridge) { 3 } else { 1 } }
								} else { if (y >= ground - 2) { 2 } else { 3 } }
							}
						}
					}
				}
			}
		}
	}
};

unit(i32, i32, i32, i32) beacon_column = fn(x, y, z, ground) {
	if (y < 16) {
		world[index_of(y)][index_of(z)][index_of(x)] = if (outer_coast(x, z)) {
			outer_tile(x, y, z, ground)
		} else { beacon_tile(x, y, z, ground) };
		beacon_column(x, y + 1, z, ground);
	};
};

unit(i32, i32) beacon_row = fn(x, z) {
	if (x < terrain_span()) {
		beacon_column(x, 0, z, beacon_ground(x, z));
		beacon_row(x + 1, z);
	};
};

unit(i32) beacon_canopy = fn(z) {
	if (z < 48) {
		beacon_canopy_row(0, z);
		beacon_canopy(z + 1);
	};
};

unit(i32, i32) beacon_canopy_row = fn(x, z) {
	if (x < 48) {
		i32 height = beacon_ground(x, z);
		if (height >= 5 && mission_tree(x, z)) {
			crown_layer(x, height + 3, z, -2, 2, true);
			crown_layer(x, height + 4, z, -2, 2, true);
			crown_layer(x, height + 5, z, -1, 1, false);
		};
		beacon_canopy_row(x + 1, z);
	};
};

unit(i32) build_beacon_island = fn(z) {
	if (z < terrain_span()) {
		beacon_row(0, z);
		build_beacon_island(z + 1);
	};
};

i32(bool) start_harbor = fn(expedition) {
	archipelago_hunt = expedition;
	lighthouse_hunt = false;
	if (beacon_phase == BeaconPhase::sandbox) {
		sandbox_cells = world;
		sandbox_material = selected_material;
	};
	beacon_phase = BeaconPhase::active;
	if (edit_epoch == 2147483647) {
		terrain_edits = empty_terrain_edits;
		edit_hints = [blank_edit_hint, blank_edit_hint, blank_edit_hint, blank_edit_hint,
			blank_edit_hint, blank_edit_hint, blank_edit_hint, blank_edit_hint,
			blank_edit_hint, blank_edit_hint, blank_edit_hint, blank_edit_hint,
			blank_edit_hint, blank_edit_hint, blank_edit_hint, blank_edit_hint];
		edit_epoch = 1;
	} else { edit_epoch = edit_epoch + 1; };
	exterior_edits = 0;
	beacon_elapsed = 0.0;
	lamp_wet = 0.0;
	tide_progress = 0.0;
	bridge_blocks = 12;
	loose_count = 0;
	beacon_guide = 1;
	guide_drop_slot = -1;
	relay_stage = 0;
	sea_level = sea_low;
	sea_phase = 0.0;
	build_beacon_island(0);
	beacon_canopy(0);
	clear_controls();
	camera_pose.x = 24.5;
	camera_pose.y = 5.0 + player_feet;
	camera_pose.z = 42.5;
	camera_pose.yaw = 0.0;
	camera_pose.pitch = -0.10;
	orientation_dirty = true;
	target_dirty = true;
	outline_dirty = true;
	grounded = true;
	flying = false;
	ground_contact_dirty = false;
	vertical_speed = 0.0;
	gait_phase = 0.0;
	gait_weight = 0.0;
	air_weight = 0.0;
	swim_weight = 0.0;
	swim_phase = 0.0;
	selected_material = 5;
	prepare_atlas();
	publish_water();
	rebuild()
};

i32() start_beacon = fn { start_harbor(false) };

i32(bool) start_lighthouse_run = fn(expedition) {
	lighthouse_parts = 0;
	i32 geometry = start_harbor(expedition);
	lighthouse_hunt = true;
	lens_x = 15.5 + 3.0 * core.sint_to_float<f32>(seeded_lattice(1, 0, 17)) / 255.0;
	regulator_z = 30.75 + 1.5 * core.sint_to_float<f32>(seeded_lattice(2, 0, 23)) / 255.0;
	igniter_z = 12.5 + 1.5 * core.sint_to_float<f32>(seeded_lattice(3, 0, 29)) / 255.0;
	beacon_guide = 0;
	geometry
};

i32() start_lighthouse = fn { start_lighthouse_run(false) };

i32() start_archipelago_lighthouse = fn {
	i32 first = seeded_lattice(1, 0, 31) % 9;
	north_cave_z = choose_cave_depth(0, first, -48 - first * 4);
	i32 ridge_first = seeded_lattice(2, 0, 37) % 9;
	eastern_summit_x = choose_summit(0, ridge_first, 124 + ridge_first * 4);
	i32 wreck_first = seeded_lattice(3, 0, 41) % 9;
	western_wreck_x = choose_wreck(0, wreck_first, -48 - wreck_first * 4);
	start_lighthouse_run(true)
};

i32() leave_beacon = fn {
	if (beacon_phase == BeaconPhase::sandbox) { 0 } else {
		beacon_phase = BeaconPhase::sandbox;
		loose_count = 0;
		world = sandbox_cells;
		selected_material = sandbox_material;
		sea_level = sea_low;
		sea_phase = 0.0;
		reset_camera();
		publish_water();
		rebuild()
	}
};

i32(i32) generate = fn(seed) {
	archipelago_hunt = false;
	lighthouse_hunt = false;
	if (beacon_phase != BeaconPhase::sandbox) { selected_material = sandbox_material; };
	beacon_phase = BeaconPhase::sandbox;
	loose_count = 0;
	sea_level = sea_low;
	world_seed = seed;
	i32 bounded = seed % 16381;
	fill_terrain(0, bounded);
	fill_leaves(0, bounded);
	reset_camera();
	prepare_atlas();
	sea_phase = 0.0;
	publish_water();
	rebuild()
};

i32(i32, i32, i32, i32) write_cell = fn(x, y, z, material) {
	if (inside(x, y, z) && material >= 0 && material < 7) {
		u8 new_material = core.int_trunc<u8>(material);
		u64 ix = index_of(x);
		u64 iy = index_of(y);
		u64 iz = index_of(z);
		if (world[iy][iz][ix] == new_material) { 0 } else {
			world[iy][iz][ix] = new_material;
			target_dirty = true;
			ground_contact_dirty = true;
			1
		}
	} else { 0 }
};

i32(i32, i32, i32, i32) edit = fn(x, y, z, material) {
	if (beacon_phase == BeaconPhase::sandbox) { write_cell(x, y, z, material) } else {
		if (editable_exterior(x, y, z)) {
			if (material > 0 && overlaps_player(x, y, z)) { -3 } else { edit_exterior(x, y, z, material) }
		} else { -4 }
	}
};

i32(f32) floor_i = fn(value) {
	i32 truncated = core.float_to_sint_trunc<i32>(value);
	if (value < core.sint_to_float<f32>(truncated)) { truncated - 1 } else { truncated }
};

i32(f32) step_sign = fn(value) {
	if (value < 0.0) { -1 } else { if (value > 0.0) { 1 } else { 0 } }
};

f32(f32) distance_delta = fn(direction) {
	if (direction > 0.0) { 1.0 / direction } else {
		if (direction < 0.0) { -1.0 / direction } else { 100000.0 }
	}
};

f32(f32, f32, i32) first_distance = fn(origin, direction, index) {
	f32 base = core.sint_to_float<f32>(index);
	if (direction > 0.0) { (base + 1.0 - origin) / direction } else {
		if (direction < 0.0) { (base - origin) / direction } else { 100000.0 }
	}
};

i32(i32, i32, i32, i32) record_pick = fn(x, y, z, side) {
	pick_result_x = x;
	pick_result_y = y;
	pick_result_z = z;
	side
};

i32(i32, i32, i32, i32, i32, i32, i32, f32, f32, f32, f32, f32, f32, f32, i32) pick_step = fn(x, y, z, side, sx, sy, sz, tx, ty, tz, dx, dy, dz, reach, remaining) {
	if (cell(x, y, z) != 0) { record_pick(x, y, z, side) } else {
		i32 low = if (beacon_phase == BeaconPhase::sandbox) { 0 } else { adventure_min() };
		i32 high = if (beacon_phase == BeaconPhase::sandbox) { terrain_span() } else { adventure_max() };
		bool leaving = (x < low && sx <= 0) || (x >= high && sx >= 0) || (y < 0 && sy <= 0) || (y >= 16 && sy >= 0) || (z < low && sz <= 0) || (z >= high && sz >= 0);
		if (remaining == 0 || leaving) { -1 } else {
			if (tx <= ty && tx <= tz) {
				i32 next_side = if (sx > 0) { 0 } else { 1 };
				if (tx <= reach) { pick_step(x + sx, y, z, next_side, sx, sy, sz, tx + dx, ty, tz, dx, dy, dz, reach, remaining - 1) } else { -1 }
			} else {
				if (ty <= tz) {
					i32 next_side = if (sy > 0) { 2 } else { 3 };
					if (ty <= reach) { pick_step(x, y + sy, z, next_side, sx, sy, sz, tx, ty + dy, tz, dx, dy, dz, reach, remaining - 1) } else { -1 }
				} else {
					i32 next_side = if (sz > 0) { 4 } else { 5 };
					if (tz <= reach) { pick_step(x, y, z + sz, next_side, sx, sy, sz, tx, ty, tz + dz, dx, dy, dz, reach, remaining - 1) } else { -1 }
				}
			}
		}
	}
};

i32(f32, f32, f32, f32, f32, f32, f32) trace_pick = fn(ox, oy, oz, dx, dy, dz, reach) {
	f32 low = if (beacon_phase == BeaconPhase::sandbox) { -128.0 } else { core.sint_to_float<f32>(adventure_min()) - 20.0 };
	f32 high = if (beacon_phase == BeaconPhase::sandbox) { 128.0 } else { core.sint_to_float<f32>(adventure_max()) + 20.0 };
	bool inside_ray_range = ox >= low && ox <= high && oy >= -128.0 && oy <= 128.0 && oz >= low && oz <= high;
	bool finite_direction = dx >= -1.0 && dx <= 1.0 && dy >= -1.0 && dy <= 1.0 && dz >= -1.0 && dz <= 1.0;
	if (!inside_ray_range || !finite_direction || (dx == 0.0 && dy == 0.0 && dz == 0.0)) { -1 } else {
		i32 x = floor_i(ox);
		i32 y = floor_i(oy);
		i32 z = floor_i(oz);
		pick_step(x, y, z, 3, step_sign(dx), step_sign(dy), step_sign(dz), first_distance(ox, dx, x), first_distance(oy, dy, y), first_distance(oz, dz, z), distance_delta(dx), distance_delta(dy), distance_delta(dz), reach, 420)
	}
};

RayHit(f32, f32, f32, f32, f32, f32, f32) pick_in_range = fn(ox, oy, oz, dx, dy, dz, reach) {
	i32 trace_face = trace_pick(ox, oy, oz, dx, dy, dz, reach);
	if (trace_face < 0) { no_hit } else {
		RayHit snapshot = { .position = cell_position(pick_result_x, pick_result_y, pick_result_z); .face = trace_face; };
		snapshot
	}
};

i32(f32, f32, f32, f32, f32, f32) terrain_ray_face = fn(ox, oy, oz, dx, dy, dz) {
	trace_pick(ox, oy, oz, dx, dy, dz, 3.402823466e38)
};

i32(f32, f32, f32, f32, f32, f32) pick = fn(ox, oy, oz, dx, dy, dz) {
	legacy_hit(pick_in_range(ox, oy, oz, dx, dy, dz, 3.402823466e38))
};

f32(f32, f32, f32) clamp_f = fn(value, low, high) {
	if (value < low) { low } else { if (value > high) { high } else { value } }
};

f32(f32) wrap_yaw = fn(angle) {
	f32 period = 6.283185307;
	i32 turns = core.float_to_sint_trunc<i32>(angle / period);
	f32 wrapped = angle - core.sint_to_float<f32>(turns) * period;
	if (wrapped > 3.141592654) { wrapped - period } else {
		if (wrapped < -3.141592654) { wrapped + period } else { wrapped }
	}
};

f32(f32) sine = fn(angle) {
	f32 phase = wrap_yaw(angle);
	f32 folded = if (phase > 1.570796327) { 3.141592654 - phase } else {
		if (phase < -1.570796327) { -3.141592654 - phase } else { phase }
	};
	f32 square = folded * folded;
	folded * (1.0 + square * (-0.166666667 + square * (0.008333333 + square * (-0.000198413 + square * (0.000002756 + square * -0.000000025)))))
};

f32(f32) cosine = fn(angle) { sine(angle + 1.570796327) };

i32(i32, i32, i32) spawn_height = fn(x, y, z) {
	if (y < 0 || cell(x, y, z) != 0) { y + 1 } else { spawn_height(x, y - 1, z) }
};

i32(i32, i32) spawn_tile = fn(x, z) {
	if (inside(x, 0, z)) {
		i32 height = spawn_height(x, 15, z);
		if (height > 0) { x + 48 * z + 2304 * height } else { -1 }
	} else { -1 }
};

i32(i32, i32) search_spawn_ring = fn(distance, dx) {
	if (dx > distance) { -1 } else {
		i32 dz = distance - abs_i(dx);
		i32 north = spawn_tile(12 + dx, 16 - dz);
		if (north >= 0) { north } else {
			i32 south = if (dz > 0) { spawn_tile(12 + dx, 16 + dz) } else { -1 };
			if (south >= 0) { south } else { search_spawn_ring(distance, dx + 1) }
		}
	}
};

i32(i32) search_spawn = fn(distance) {
	if (distance > 28) { -1 } else {
		i32 tile = search_spawn_ring(distance, -distance);
		if (tile >= 0) { tile } else { search_spawn(distance + 1) }
	}
};

unit() spawn_player = fn {
	i32 tile = search_spawn(0);
	if (tile >= 0) {
		camera_pose.x = core.sint_to_float<f32>(tile % 48) + 0.5;
		camera_pose.y = core.sint_to_float<f32>(tile / 2304) + player_feet;
		camera_pose.z = core.sint_to_float<f32>((tile / 48) % 48) + 0.5;
		grounded = true;
	} else {
		camera_pose.x = 12.5;
		camera_pose.y = 10.0;
		camera_pose.z = 16.5;
		flying = true;
		grounded = false;
	};
	boom_distance = 0.0;
	boom_initialized = false;
	ground_contact_dirty = false;
	jump_pending = false;
	vertical_speed = 0.0;
	gait_phase = 0.0;
	gait_weight = 0.0;
	air_weight = if (grounded) { 0.0 } else { 1.0 };
	swim_weight = 0.0;
	swim_phase = 0.0;
	flight_pitch = 0.0;
	flight_bank = 0.0;
	outline_dirty = true;
	target_dirty = true;
};

unit() clear_controls = fn {
	edit_pose_time = 0.0;
	controls = 0;
	pulse_controls = 0;
	jump_pending = false;
	held_edits = 0;
	repeat_edit_mode = -1;
	repeat_edit_wait = 0.0;
};

unit() reset_camera = fn {
	flying = false;
	spawn_player();
	camera_pose.yaw = -0.72664234;
	camera_pose.pitch = -0.10;
	clear_controls();
	orientation_dirty = true;
};

unit() toggle_flight = fn {
	if (beacon_phase == BeaconPhase::sandbox) {
		flying = !flying;
		grounded = false;
		ground_contact_dirty = !flying;
		jump_pending = false;
		vertical_speed = 0.0;
	};
};

unit(i32, i32) control = fn(action, down) {
	if (action >= 0 && action < 8) {
		i32 bit = 1 << action;
		if (down != 0) {
			bool first_press = ((controls | pulse_controls) & bit) == 0;
			controls = controls | bit;
			if (first_press && action == 4 && !flying) { jump_pending = true; };
			if (first_press && action == 7) { toggle_flight(); };
		} else { controls = controls & ~bit; };
	};
};

unit(i32) pulse_control = fn(action) {
	if (action == 7) {
		if ((controls & 128) == 0) { toggle_flight(); };
	} else {
		if (action >= 0 && action < 7) {
			i32 bit = 1 << action;
			bool first_press = ((controls | pulse_controls) & bit) == 0;
			pulse_controls = pulse_controls | bit;
			if (first_press && action == 4 && !flying) { jump_pending = true; };
		};
	};
};

i32(i32) active = fn(mask) { if (((controls | pulse_controls) & mask) != 0) { 1 } else { 0 } };

unit(f32, f32) look = fn(dx, dy) {
	if (dx >= -10000.0 && dx <= 10000.0 && dy >= -10000.0 && dy <= 10000.0) {
		f32 next_yaw = wrap_yaw(camera_pose.yaw + dx * 0.0034);
		f32 next_pitch = clamp_f(camera_pose.pitch - dy * 0.0034, -1.46, 1.35);
		if (next_yaw != camera_pose.yaw || next_pitch != camera_pose.pitch) {
			camera_pose.yaw = next_yaw;
			camera_pose.pitch = next_pitch;
			orientation_dirty = true;
			target_dirty = true;
		};
	};
};

bool(i32, i32, i32, i32, i32, i32) solid_layers = fn(x0, x1, y, last_y, z0, z1) {
	if (y > last_y) { false } else {
		cell(x0, y, z0) != 0
			|| (x1 != x0 && cell(x1, y, z0) != 0)
			|| (z1 != z0 && (cell(x0, y, z1) != 0 || (x1 != x0 && cell(x1, y, z1) != 0)))
			|| solid_layers(x0, x1, y + 1, last_y, z0, z1)
	}
};

bool(f32, f32, f32) player_collides = fn(x, y, z) {
	solid_layers(
		floor_i(x - player_radius + contact_skin),
		floor_i(x + player_radius - contact_skin),
		floor_i(y - player_feet + contact_skin),
		floor_i(y + player_head - contact_skin),
		floor_i(z - player_radius + contact_skin),
		floor_i(z + player_radius - contact_skin)
	)
};

bool(i32, i32, i32) overlaps_player = fn(x, y, z) {
	f32 block_x = core.sint_to_float<f32>(x);
	f32 block_y = core.sint_to_float<f32>(y);
	f32 block_z = core.sint_to_float<f32>(z);
	camera_pose.x - player_radius + contact_skin < block_x + 1.0
		&& camera_pose.x + player_radius - contact_skin > block_x
		&& camera_pose.y - player_feet + contact_skin < block_y + 1.0
		&& camera_pose.y + player_head - contact_skin > block_y
		&& camera_pose.z - player_radius + contact_skin < block_z + 1.0
		&& camera_pose.z + player_radius - contact_skin > block_z
};

f32(f32, f32, f32, f32) contact_position = fn(prior, next, low_extent, high_extent) {
	if (next > prior) {
		core.sint_to_float<f32>(floor_i(next + high_extent - contact_skin)) - high_extent
	} else {
		core.sint_to_float<f32>(floor_i(next - low_extent + contact_skin) + 1) + low_extent
	}
};

f32() walk_min = fn { if (beacon_phase == BeaconPhase::sandbox) { -20.0 } else { core.sint_to_float<f32>(adventure_min()) + 0.31 } };

f32() walk_max = fn { if (beacon_phase == BeaconPhase::sandbox) { terrain_span_f() + 20.0 } else { core.sint_to_float<f32>(adventure_max()) - 0.31 } };

unit(f32, f32, f32, i32) move_player_steps = fn(dx, dy, dz, remaining) {
	if (dx != 0.0) {
		f32 next_x = clamp_f(camera_pose.x + dx, walk_min(), walk_max());
		if (next_x != camera_pose.x && player_collides(next_x, camera_pose.y, camera_pose.z)) {
			next_x = contact_position(camera_pose.x, next_x, player_radius, player_radius);
		};
		camera_pose.x = next_x;
	};
	if (dz != 0.0) {
		f32 next_z = clamp_f(camera_pose.z + dz, walk_min(), walk_max());
		if (next_z != camera_pose.z && player_collides(camera_pose.x, camera_pose.y, next_z)) {
			next_z = contact_position(camera_pose.z, next_z, player_radius, player_radius);
		};
		camera_pose.z = next_z;
	};
	f32 remaining_dy = dy;
	if (dy != 0.0) {
		f32 next_y = camera_pose.y + dy;
		if (flying) { next_y = clamp_f(next_y, 1.8, 35.0); };
		if (next_y != camera_pose.y && player_collides(camera_pose.x, next_y, camera_pose.z)) {
			next_y = contact_position(camera_pose.y, next_y, player_feet, player_head);
			remaining_dy = 0.0;
			vertical_speed = 0.0;
		};
		camera_pose.y = next_y;
	};
	if (remaining > 1) { move_player_steps(dx, remaining_dy, dz, remaining - 1); };
};

unit(f32, f32, f32) move_camera = fn(dt, sy, cy) {
	if (dt > 0.0) {
		i32 forward = active(1) - active(2);
		i32 right = active(8) - active(4);
		i32 up = if (flying) { active(16) - active(32) } else { 0 };
		i32 axes = forward * forward + right * right + up * up;
		f32 normal = if (axes == 3) { 0.577350269 } else { if (axes == 2) { 0.707106781 } else { 1.0 } };
		f32 speed = if (active(64) == 1) { 8.0 } else { 4.8 };
		f32 immersion = if (!flying && camera_pose.y - player_feet < sea_level + swell + chop) {
			clamp_f((sea_surface(camera_pose.x, camera_pose.z) - (camera_pose.y - player_feet)) / (player_feet + player_head), 0.0, 1.0)
		} else { 0.0 };
		f32 stride = dt * speed * normal * (1.0 - 0.65 * immersion);
		f32 f = core.sint_to_float<f32>(forward);
		f32 r = core.sint_to_float<f32>(right);
		f32 motion_x = sy * f + cy * r;
		f32 motion_z = 0.0 - cy * f + sy * r;
		f32 dx = motion_x * stride;
		f32 dz = motion_z * stride;
		if (!flying) {
			if (ground_contact_dirty) {
				grounded = vertical_speed <= 0.0 && player_collides(camera_pose.x, camera_pose.y - 0.018, camera_pose.z);
				ground_contact_dirty = false;
			};
			if (jump_pending) {
				if (grounded) {
					vertical_speed = 7.4 - 2.0 * immersion;
					grounded = false;
				} else {
					if (immersion >= 0.15 && vertical_speed < 3.8) { vertical_speed = 3.8; };
				};
			};
			f32 lift = if (immersion > 0.0 && active(16) == 1) { 48.0 } else { 35.0 };
			f32 acceleration = lift * immersion - 22.0;
			if (acceleration > 0.0) { grounded = false; };
			vertical_speed = if (grounded) { 0.0 } else {
				f32 damped = vertical_speed * (1.0 - 4.0 * immersion * dt);
				clamp_f(damped + acceleration * dt, -18.0, 8.0)
			};
		};
		jump_pending = false;
		f32 dy = if (flying) { core.sint_to_float<f32>(up) * stride } else { vertical_speed * dt };
		f32 previous_x = camera_pose.x;
		f32 previous_y = camera_pose.y;
		f32 previous_z = camera_pose.z;
		if (dx != 0.0 || dy != 0.0 || dz != 0.0) {
			if (dt <= 0.015) { move_player_steps(dx, dy, dz, 1); } else {
				if (dt <= 0.03) { move_player_steps(dx * 0.5, dy * 0.5, dz * 0.5, 2); } else {
					move_player_steps(dx * 0.25, dy * 0.25, dz * 0.25, 4);
				};
			};
			if (!flying) { grounded = vertical_speed <= 0.0 && player_collides(camera_pose.x, camera_pose.y - 0.018, camera_pose.z); };
		};
		gait_weight = 0.0;
		if (grounded && !flying && (camera_pose.x != previous_x || camera_pose.z != previous_z)) {
			f32 travelled = ((camera_pose.x - previous_x) * motion_x + (camera_pose.z - previous_z) * motion_z) * normal;
			gait_weight = clamp_f((travelled / dt - 0.04) * 0.15, 0.0, 1.0);
			if (gait_weight > 0.0) {
				f32 stride_phase = travelled * (if (forward < 0) { -5.2 } else { 5.2 });
				gait_phase = wrap_yaw(gait_phase + stride_phase);
			};
		};
		if (flying) {
			f32 moved_x = camera_pose.x - previous_x;
			f32 moved_z = camera_pose.z - previous_z;
			f32 pitch_target = 0.0;
			f32 bank_target = 0.0;
			if (moved_x != 0.0 || moved_z != 0.0) {
				f32 lean_rate = 0.057 / (if (dt < 0.0001) { 0.0001 } else { dt });
				pitch_target = clamp_f((moved_x * sy - moved_z * cy) * lean_rate, -0.39, 0.39);
				bank_target = clamp_f((moved_x * cy + moved_z * sy) * lean_rate, -0.34, 0.34);
			};
			flight_pitch = flight_pitch + clamp_f(pitch_target - flight_pitch, -dt * 2.7, dt * 2.7);
			flight_bank = flight_bank + clamp_f(bank_target - flight_bank, -dt * 2.7, dt * 2.7);
		} else {
			if (grounded) {
				flight_pitch = 0.0;
				flight_bank = 0.0;
			} else {
				flight_pitch = flight_pitch + clamp_f(-flight_pitch, -dt * 2.7, dt * 2.7);
				flight_bank = flight_bank + clamp_f(-flight_bank, -dt * 2.7, dt * 2.7);
			};
		};
		f32 air_target = if (grounded && !flying) { 0.0 } else { 1.0 };
		f32 air_step = dt * 9.0;
		air_weight = air_weight + clamp_f(air_target - air_weight, 0.0 - air_step, air_step);
		if (flying) {
			swim_weight = 0.0;
			swim_phase = 0.0;
		} else {
			f32 swim_target = if (grounded) { 0.0 } else { clamp_f((immersion - 0.28) * 2.9, 0.0, 1.0) };
			f32 swim_step = dt * 5.6;
			swim_weight = swim_weight + clamp_f(swim_target - swim_weight, 0.0 - swim_step, swim_step);
			if (swim_target > 0.0) {
				f32 advance = absolute_f(camera_pose.x - previous_x) + absolute_f(camera_pose.z - previous_z)
					+ 0.30 * absolute_f(camera_pose.y - previous_y);
				swim_phase = wrap_yaw(swim_phase + advance * 5.8);
			} else {
				if (swim_weight == 0.0) { swim_phase = 0.0; };
			};
		};
		if (camera_pose.y < -6.0) { spawn_player(); };
		if (camera_pose.x != previous_x || camera_pose.y != previous_y || camera_pose.z != previous_z) { target_dirty = true; };
		pulse_controls = 0;
	};
};

unit(f32, f32, f32, f32, f32, f32) wire_edge = fn(x0, y0, z0, x1, y1, z1) {
	i32 at = wire_position;
	u64 origin = index_of(at);
	u64 terminal = index_of(at + 1);
	wire[origin][0] = x0;
	wire[origin][1] = y0;
	wire[origin][2] = z0;
	wire[terminal][0] = x1;
	wire[terminal][1] = y1;
	wire[terminal][2] = z1;
	wire_position = at + 2;
};

unit(RayHit) publish_outline = fn(hit) {
	if (outline_dirty || hit.face != selected_hit.face || !same_position(hit.position, selected_hit.position)) {
		outline_dirty = false;
		selected_hit = hit;
		wire_position = 0;
		if (hit.face >= 0) {
			f32 x = core.sint_to_float<f32>(hit.position.x);
			f32 y = core.sint_to_float<f32>(hit.position.y);
			f32 z = core.sint_to_float<f32>(hit.position.z);
			f32 x0 = x - 0.012;
			f32 y0 = y - 0.012;
			f32 z0 = z - 0.012;
			f32 x1 = x + 1.012;
			f32 y1 = y + 1.012;
			f32 z1 = z + 1.012;
			wire_edge(x0, y0, z0, x1, y0, z0);
			wire_edge(x1, y0, z0, x1, y0, z1);
			wire_edge(x1, y0, z1, x0, y0, z1);
			wire_edge(x0, y0, z1, x0, y0, z0);
			wire_edge(x0, y1, z0, x1, y1, z0);
			wire_edge(x1, y1, z0, x1, y1, z1);
			wire_edge(x1, y1, z1, x0, y1, z1);
			wire_edge(x0, y1, z1, x0, y1, z0);
			wire_edge(x0, y0, z0, x0, y1, z0);
			wire_edge(x1, y0, z0, x1, y1, z0);
			wire_edge(x1, y0, z1, x1, y1, z1);
			wire_edge(x0, y0, z1, x0, y1, z1);
		};
		unsafe { host.outline(core.pointer_cast<*?u8>(&?wire[0][0]), wire_position); };
	};
};

i32() sea_width = fn { terrain_span() / 4 + 12 };

i32(f32) sea_origin = fn(axis) {
	if (beacon_phase == BeaconPhase::sandbox || (axis >= -4.0 && axis <= 100.0)) { -20 } else {
		grid_axis(floor_i(axis), 4) * 4 - 64
	}
};

f32(i32, i32, i32) sea_coordinate = fn(index, width, origin) {
	if (index == 0) {
		if (beacon_phase == BeaconPhase::sandbox) { -192.0 } else { -608.0 }
	} else {
		if (index == width) {
			if (beacon_phase == BeaconPhase::sandbox) { 192.0 } else { 704.0 }
		} else { core.sint_to_float<f32>(origin + (index - 1) * 4) }
	}
};

f32(f32, f32) sea_wave = fn(x, z) {
	sea_level + swell * sine(0.23 * x + 0.19 * z - sea_phase)
		+ chop * sine(-0.35 * x + 0.24 * z - 2.0 * sea_phase)
};

unit(i32, u64, f32, i32) sample_sea_row = fn(x, z, pz, width) {
	if (x <= width) {
		sea_samples[z][index_of(x)] = sea_wave(sea_coordinate(x, width, sea_origin_x), pz);
		sample_sea_row(x + 1, z, pz, width);
	};
};

unit(i32, i32) sample_sea = fn(z, width) {
	if (z <= width) {
		sample_sea_row(0, index_of(z), sea_coordinate(z, width, sea_origin_z), width);
		sample_sea(z + 1, width);
	};
};

f32(f32, f32) sea_surface = fn(x, z) {
	f32 origin_x = core.sint_to_float<f32>(sea_origin_x);
	f32 origin_z = core.sint_to_float<f32>(sea_origin_z);
	i32 last_cell = sea_width() - 3;
	f32 limit = core.sint_to_float<f32>(last_cell + 1);
	f32 gx = clamp_f((x - origin_x) * 0.25, 0.0, limit);
	f32 gz = clamp_f((z - origin_z) * 0.25, 0.0, limit);
	i32 ix = min_i(floor_i(gx), last_cell);
	i32 iz = min_i(floor_i(gz), last_cell);
	f32 u = gx - core.sint_to_float<f32>(ix);
	f32 v = gz - core.sint_to_float<f32>(iz);
	u64 left = index_of(ix + 1);
	u64 right = left + 1;
	u64 near = index_of(iz + 1);
	u64 far = near + 1;
	f32 b = sea_samples[near][right];
	f32 c = sea_samples[far][left];
	if (u + v <= 1.0) {
		f32 a = sea_samples[near][left];
		a + (b - a) * u + (c - a) * v
	} else {
		f32 d = sea_samples[far][right];
		d + (c - d) * (1.0 - u) + (b - d) * (1.0 - v)
	}
};

unit(u64, u64, u64, i32, i32, i32, bool) write_sea_vertex = fn(row, column, corner, sx, sz, width, relayout) {
	if (relayout) {
		sea_vertices[row][column][corner][0] = sea_coordinate(sx, width, sea_origin_x);
		sea_vertices[row][column][corner][2] = sea_coordinate(sz, width, sea_origin_z);
	};
	sea_vertices[row][column][corner][1] = sea_samples[index_of(sz)][index_of(sx)];
};

unit(i32, i32, i32, i32, bool) sea_mesh_row = fn(x, z, offset, width, relayout) {
	if (x < width) {
		i32 at = offset + x;
		u64 row = index_of(at / 36);
		u64 column = index_of(at % 36);
		write_sea_vertex(row, column, 0, x, z, width, relayout);
		write_sea_vertex(row, column, 1, x, z + 1, width, relayout);
		write_sea_vertex(row, column, 2, x + 1, z, width, relayout);
		write_sea_vertex(row, column, 3, x + 1, z + 1, width, relayout);
		write_sea_vertex(row, column, 4, x + 1, z, width, relayout);
		write_sea_vertex(row, column, 5, x, z + 1, width, relayout);
		sea_mesh_row(x + 1, z, offset, width, relayout);
	};
};

unit(i32, i32, bool) sea_mesh = fn(z, width, relayout) {
	if (z < width) {
		sea_mesh_row(0, z, z * width, width, relayout);
		sea_mesh(z + 1, width, relayout);
	};
};

unit() publish_water = fn {
	i32 width = sea_width();
	i32 x = sea_origin(camera_pose.x);
	i32 z = sea_origin(camera_pose.z);
	bool relayout = width != sea_mesh_width || x != sea_origin_x || z != sea_origin_z;
	sea_origin_x = x;
	sea_origin_z = z;
	sample_sea(0, width);
	sea_mesh(0, width, relayout);
	sea_mesh_width = width;
	unsafe { host.water(core.pointer_cast<*?u8>(&?sea_vertices[0][0][0][0]), width * width * 6); };
};

f32(BeaconPhase) beacon_phase_code = fn(phase) {
	if (phase == BeaconPhase::sandbox) { 0.0 } else {
		if (phase == BeaconPhase::active) { 1.0 } else {
			if (phase == BeaconPhase::restored) { 2.0 } else { 3.0 }
		}
	}
};

unit(f32, f32, f32, f32, f32, f32, f32, f32, RayHit) publish_frame = fn(x, y, z, sy, cy, sp, cp, view_pitch, hit) {
	f32 q = view_scale;
	f32 qw = q / frame_values[20];
	f32 depth = -1.00100050;
	f32 near = -0.32016008;
	f32 zz = sy * cp * x + sp * y - cy * cp * z;
	frame_values[0] = qw * cy;
	frame_values[1] = 0.0 - q * sy * sp;
	frame_values[2] = 0.0 - depth * sy * cp;
	frame_values[3] = sy * cp;
	frame_values[4] = 0.0;
	frame_values[5] = q * cp;
	frame_values[6] = 0.0 - depth * sp;
	frame_values[7] = sp;
	frame_values[8] = qw * sy;
	frame_values[9] = q * cy * sp;
	frame_values[10] = depth * cy * cp;
	frame_values[11] = 0.0 - cy * cp;
	frame_values[12] = qw * (0.0 - cy * x - sy * z);
	frame_values[13] = q * (sy * sp * x - cp * y - cy * sp * z);
	frame_values[14] = depth * zz + near;
	frame_values[15] = 0.0 - zz;
	frame_values[16] = x;
	frame_values[17] = y;
	frame_values[18] = z;
	frame_values[19] = view_pitch;
	frame_values[21] = clock_seconds;
	frame_values[22] = if (flying) { 1.0 } else { 0.0 };
	frame_values[23] = if (grounded) { 1.0 } else { 0.0 };
	frame_values[24] = core.sint_to_float<f32>(selected_material);
	frame_values[25] = beacon_phase_code(beacon_phase);
	frame_values[26] = 1.0 - lamp_wet / lamp_limit;
	frame_values[27] = tide_progress;
	frame_values[28] = core.sint_to_float<f32>(bridge_blocks);
	frame_values[29] = core.sint_to_float<f32>(relay_stage);
	publish_beacon_guide(hit);
	frame_values[35] = 0.0;
	frame_values[36] = 0.0;
	i32 next_part = if (lighthouse_hunt && beacon_phase == BeaconPhase::active) { nearest_part(0, -1) } else { -1 };
	frame_values[39] = if (lighthouse_hunt && beacon_phase != BeaconPhase::sandbox) { core.sint_to_float<f32>(lighthouse_parts) } else { -1.0 };
	frame_values[40] = core.sint_to_float<f32>(next_part);
	frame_values[41] = if (archipelago_hunt) { lighthouse_part_z(0) } else { lens_x };
	frame_values[42] = if (archipelago_hunt) { lighthouse_part_x(1) } else { regulator_z };
	frame_values[43] = if (archipelago_hunt) { lighthouse_part_x(2) } else { igniter_z };
	if (beacon_phase == BeaconPhase::active && frame_values[30] == 0.0) {
		f32 goal_x = if (lighthouse_hunt) {
			if (next_part >= 0) { lighthouse_part_x(next_part) } else { 24.5 }
		} else { if (relay_stage == 1) { 9.5 } else { 24.5 } };
		f32 goal_z = if (lighthouse_hunt) {
			if (next_part >= 0) {
				if (archipelago_hunt && next_part == 0 && camera_pose.z >= 3.6) { 3.1 } else { lighthouse_part_z(next_part) }
			} else { 5.0 }
		} else { if (relay_stage == 0) { 15.5 } else { if (relay_stage == 1) { 8.5 } else { 5.0 } } };
		f32 dx = goal_x - camera_pose.x;
		f32 dz = goal_z - camera_pose.z;
		if (dx * dx + dz * dz >= 0.25) {
			frame_values[35] = dx * cy + dz * sy;
			frame_values[36] = dx * sy - dz * cy;
		};
	};
	frame_values[37] = camera_pose.x;
	frame_values[38] = camera_pose.z;
	i32 legacy = legacy_hit(hit);
	i32 frame_hit = if (hit.face >= 0 && legacy < 0) { 1 } else { legacy };
	unsafe { host.frame(core.pointer_cast<*?u8>(&?frame_values[0]), frame_hit); };
};

unit() update_orientation = fn {
	if (orientation_dirty) {
		sin_yaw = sine(camera_pose.yaw);
		cos_yaw = cosine(camera_pose.yaw);
		sin_pitch = sine(camera_pose.pitch);
		cos_pitch = cosine(camera_pose.pitch);
		orientation_dirty = false;
	};
};

RayHit() current_view_target = fn {
	if (target_dirty) {
		f32 dx = sin_yaw * cos_pitch;
		f32 dy = sin_pitch;
		f32 dz = 0.0 - cos_yaw * cos_pitch;
		target_hit = pick_in_range(camera_pose.x, camera_pose.y, camera_pose.z, dx, dy, dz, 5.0);
		target_dirty = false;
	};
	target_hit
};

i32() cycle_camera = fn {
	third_person = !third_person;
	boom_distance = 0.0;
	boom_initialized = false;
	if (third_person) { 1 } else { 0 }
};

unit(f32, f32, f32, f32, f32, f32) avatar_vertex = fn(x, y, z, r, g, b) {
	u64 row = index_of(avatar_position / 24);
	u64 col = index_of(avatar_position % 24);
	f32 dy = y - avatar_joint_y;
	f32 body_z = dy * avatar_joint_sine + z * avatar_joint_cosine;
	f32 joint_dy = dy * avatar_joint_cosine;
	f32 joint_dz = z * avatar_joint_sine;
	f32 body_x = x;
	if (avatar_flight_pitch != 0.0 || avatar_flight_bank != 0.0 || avatar_swim != 0.0) {
		f32 local_y = avatar_joint_y + joint_dy - joint_dz + 0.50;
		f32 tilted_y = local_y * avatar_pitch_cosine - body_z * avatar_pitch_sine;
		body_z = local_y * avatar_pitch_sine + body_z * avatar_pitch_cosine;
		body_x = x * avatar_bank_cosine + tilted_y * avatar_bank_sine;
		avatar_vertices[row][col][1] = camera_pose.y + tilted_y * avatar_bank_cosine - x * avatar_bank_sine - 0.50;
	} else {
		avatar_vertices[row][col][1] = camera_pose.y + avatar_joint_y + joint_dy - joint_dz;
	};
	avatar_vertices[row][col][0] = camera_pose.x + cos_yaw * body_x + sin_yaw * body_z;
	avatar_vertices[row][col][2] = camera_pose.z + sin_yaw * body_x - cos_yaw * body_z;
	avatar_vertices[row][col][3] = r;
	avatar_vertices[row][col][4] = g;
	avatar_vertices[row][col][5] = b;
	avatar_position = avatar_position + 1;
};

unit(f32, f32, f32, f32, f32, f32, f32, f32, f32, f32, f32, f32, f32, f32, f32) avatar_face = fn(ax, ay, az, bx, by, bz, cx, cy, cz, dx, dy, dz, r, g, b) {
	avatar_vertex(ax, ay, az, r, g, b);
	avatar_vertex(bx, by, bz, r, g, b);
	avatar_vertex(cx, cy, cz, r, g, b);
	avatar_vertex(ax, ay, az, r, g, b);
	avatar_vertex(cx, cy, cz, r, g, b);
	avatar_vertex(dx, dy, dz, r, g, b);
};

unit(f32, f32, f32, f32, f32, f32, f32, f32, f32) avatar_box = fn(x0, x1, y0, y1, z0, z1, r, g, b) {
	avatar_face(x0,y0,z0, x0,y0,z1, x0,y1,z1, x0,y1,z0, r*0.82,g*0.82,b*0.82);
	avatar_face(x1,y0,z1, x1,y0,z0, x1,y1,z0, x1,y1,z1, r*0.94,g*0.94,b*0.94);
	avatar_face(x0,y0,z1, x0,y0,z0, x1,y0,z0, x1,y0,z1, r*0.64,g*0.64,b*0.64);
	avatar_face(x0,y1,z0, x0,y1,z1, x1,y1,z1, x1,y1,z0, r,g,b);
	avatar_face(x1,y0,z0, x0,y0,z0, x0,y1,z0, x1,y1,z0, r*0.89,g*0.89,b*0.89);
	avatar_face(x0,y0,z1, x1,y0,z1, x1,y1,z1, x0,y1,z1, r*0.75,g*0.75,b*0.75);
};

unit(f32, f32) avatar_joint = fn(pivot, angle) {
	avatar_joint_y = pivot;
	avatar_joint_sine = if (angle == 0.0) { 0.0 } else { sine(angle) };
	avatar_joint_cosine = if (angle == 0.0) { 1.0 } else { cosine(angle) };
};

unit(bool) publish_avatar = fn(visible) {
	if (visible) {
		if (!avatar_visible || avatar_x != camera_pose.x || avatar_y != camera_pose.y || avatar_z != camera_pose.z || avatar_yaw != camera_pose.yaw
			|| avatar_phase != gait_phase || avatar_gait != gait_weight || avatar_air != air_weight
			|| avatar_flight_pitch != flight_pitch || avatar_flight_bank != flight_bank
			|| avatar_swim != swim_weight || avatar_swim_phase != swim_phase
			|| avatar_edit_time != edit_pose_time || avatar_edit_place != edit_pose_place) {
			avatar_x = camera_pose.x;
			avatar_y = camera_pose.y;
			avatar_z = camera_pose.z;
			avatar_yaw = camera_pose.yaw;
			avatar_phase = gait_phase;
			avatar_gait = gait_weight;
			avatar_air = air_weight;
			if (avatar_flight_pitch != flight_pitch || avatar_swim != swim_weight) {
				avatar_flight_pitch = flight_pitch;
				avatar_swim = swim_weight;
				f32 pitch = flight_pitch + swim_weight * 0.63;
				avatar_pitch_sine = if (pitch == 0.0) { 0.0 } else { sine(pitch) };
				avatar_pitch_cosine = if (pitch == 0.0) { 1.0 } else { cosine(pitch) };
			};
			avatar_swim_phase = swim_phase;
			if (avatar_flight_bank != flight_bank) {
				avatar_flight_bank = flight_bank;
				avatar_bank_sine = if (flight_bank == 0.0) { 0.0 } else { sine(flight_bank) };
				avatar_bank_cosine = if (flight_bank == 0.0) { 1.0 } else { cosine(flight_bank) };
			};
			avatar_edit_time = edit_pose_time;
			avatar_edit_place = edit_pose_place;
			f32 tool_pose = if (edit_pose_time > 0.0) {
				f32 t = 1.0 - edit_pose_time / 0.34;
				if (edit_pose_place) {
					0.95 * clamp_f(if (t < 0.26) { t * 5.0 } else { (1.0 - t) * 1.75 }, 0.0, 1.0)
				} else {
					if (t < 0.25) { -t * 3.4 } else {
						if (t < 0.48) { -0.85 + (t - 0.25) * 9.0 } else { 1.22 * (1.0 - t) / 0.52 }
					}
				}
			} else { 0.0 };
			avatar_position = 0;
			f32 dry = 1.0 - swim_weight;
			f32 swinging_air = air_weight * dry;
			f32 swing = sine(gait_phase) * gait_weight * (1.0 - air_weight) * dry;
			f32 stroke = if (swim_weight == 0.0) { 0.0 } else { sine(swim_phase) * swim_weight };
			avatar_joint(0.0, 0.0);
			avatar_box(-0.19,0.19, -0.23,0.15, -0.18,0.18, 0.91,0.66,0.39);
			avatar_box(-0.21,0.21, -0.84,-0.24, -0.14,0.14, 0.91,0.61,0.14);
			avatar_box(-0.205,0.205, 0.10,0.178, -0.20,0.20, 0.21,0.36,0.34);
			avatar_box(-0.18,0.18, 0.081,0.11, 0.16,0.28, 0.26,0.44,0.40);
			avatar_box(-0.15,0.15, -0.76,-0.30, -0.26,-0.127, 0.26,0.40,0.29);
			avatar_joint(-0.25, swing * 0.60 - swinging_air * 0.57 - swim_weight * 1.25 + stroke * 0.80);
			avatar_box(-0.28,-0.202, -0.79,-0.25, -0.095,0.095, 0.63,0.42,0.26);
			avatar_joint(-0.25, 0.0 - swing * 0.60 - swinging_air * 0.37 - swim_weight * 1.25 - stroke * 0.80 - tool_pose);
			avatar_box(0.202,0.28, -0.79,-0.25, -0.095,0.095, 0.63,0.42,0.26);
			avatar_joint(-0.84, 0.0 - swing * 0.66 - swinging_air * 0.44 - stroke * 0.32);
			avatar_box(-0.17,-0.021, -1.59,-0.84, -0.13,0.13, 0.22,0.32,0.45);
			avatar_box(-0.18,-0.02, -1.62,-1.42, -0.14,0.20, 0.23,0.14,0.09);
			avatar_joint(-0.84, swing * 0.66 + swinging_air * 0.29 + stroke * 0.32);
			avatar_box(0.021,0.17, -1.59,-0.84, -0.13,0.13, 0.22,0.32,0.45);
			avatar_box(0.02,0.18, -1.62,-1.42, -0.14,0.20, 0.23,0.14,0.09);
			unsafe { host.player(core.pointer_cast<*?u8>(&?avatar_vertices[0][0][0]), avatar_position); };
		};
	} else {
		if (avatar_visible) {
			unsafe { host.player(core.pointer_cast<*?u8>(&?avatar_vertices[0][0][0]), 0); };
		};
	};
	avatar_visible = visible;
};

f32(RayHit, f32, f32, f32, f32, f32, f32) ray_hit_distance = fn(hit, ox, oy, oz, dx, dy, dz) {
	i32 side = hit.face;
	f32 x = core.sint_to_float<f32>(hit.position.x);
	f32 y = core.sint_to_float<f32>(hit.position.y);
	f32 z = core.sint_to_float<f32>(hit.position.z);
	if (side < 2 && dx != 0.0) {
		(x + (if (side == 1) { 1.0 } else { 0.0 }) - ox) / dx
	} else {
		if (side >= 4 && dz != 0.0) {
			(z + (if (side == 5) { 1.0 } else { 0.0 }) - oz) / dz
		} else {
			if (dy != 0.0) { (y + (if (side == 3) { 1.0 } else { 0.0 }) - oy) / dy } else { 0.0 }
		}
	}
};

unit() center_aim = fn {
	if (aim_was_offset) {
		host.aim(0.0, 0.0);
		aim_was_offset = false;
	};
};

f32(f32, f32, f32, f32, f32, f32, f32) camera_boom_probe = fn(ox, oy, oz, dx, dy, dz, reach) {
	f32 ex = ox + dx * reach;
	f32 ey = oy + dy * reach;
	f32 ez = oz + dz * reach;
	f32 low = if (beacon_phase == BeaconPhase::sandbox) { 0.0 } else { core.sint_to_float<f32>(adventure_min()) };
	f32 high = if (beacon_phase == BeaconPhase::sandbox) { terrain_span_f() } else { core.sint_to_float<f32>(adventure_max()) };
	bool outside = (ox < low && ex < low) || (ox >= high && ex >= high)
		|| (oy < 0.0 && ey < 0.0) || (oy >= 16.0 && ey >= 16.0)
		|| (oz < low && ez < low) || (oz >= high && ez >= high);
	if (reach <= 0.0 || outside) { reach } else {
		RayHit hit = pick_in_range(ox, oy, oz, dx, dy, dz, reach);
		if (hit.face < 0) { reach } else {
			bool starts_in_hit = hit.position.x == floor_i(ox) && hit.position.y == floor_i(oy)
				&& hit.position.z == floor_i(oz);
			if (starts_in_hit) { 0.0 } else {
				clamp_f(ray_hit_distance(hit, ox, oy, oz, dx, dy, dz) - 0.29, 0.0, reach)
			}
		}
	}
};

f32(f32, f32, f32, f32, f32, f32, f32, f32, f32, f32, f32, f32) camera_corner = fn(near_x, near_y, near_z, ux, uy, uz, sx, sz, dx, dy, dz, reach) {
	camera_boom_probe(near_x + ux + sx, near_y + uy, near_z + uz + sz, dx, dy, dz, reach)
};

bool(i32, i32, i32, f32, f32, f32, f32, f32, f32) camera_sees_target = fn(hit_x, hit_y, hit_z, view_x, view_y, view_z, target_x, target_y, target_z) {
	f32 dx = target_x - view_x;
	f32 dy = target_y - view_y;
	f32 dz = target_z - view_z;
	f32 ax = if (dx < 0.0) { 0.0 - dx } else { dx };
	f32 ay = if (dy < 0.0) { 0.0 - dy } else { dy };
	f32 az = if (dz < 0.0) { 0.0 - dz } else { dz };
	f32 xy = if (ax > ay) { ax } else { ay };
	f32 reach = if (xy > az) { xy } else { az };
	if (reach <= 0.0) { true } else {
		i32 visible_face = trace_pick(view_x, view_y, view_z, dx / reach, dy / reach, dz / reach, reach);
		visible_face >= 0 && pick_result_x == hit_x && pick_result_y == hit_y && pick_result_z == hit_z
	}
};

f32(i32, i32, i32, f32, f32, f32, f32, f32, f32, f32, f32, i32) find_visible_boom = fn(hit_x, hit_y, hit_z, dx, dy, dz, target_x, target_y, target_z, min, max, remaining) {
	if (remaining == 0) { min } else {
		f32 mid = (min + max) * 0.5;
		bool visible = camera_sees_target(hit_x, hit_y, hit_z, camera_pose.x + dx * mid, camera_pose.y + dy * mid, camera_pose.z + dz * mid,
			target_x, target_y, target_z);
		if (visible) {
			find_visible_boom(hit_x, hit_y, hit_z, dx, dy, dz, target_x, target_y, target_z, mid, max, remaining - 1)
		} else {
			find_visible_boom(hit_x, hit_y, hit_z, dx, dy, dz, target_x, target_y, target_z, min, mid, remaining - 1)
		}
	}
};

f32(f32, f32, f32, f32, f32, f32, f32, f32, f32) chase_terrain_limit = fn(ox, oy, oz, dx, dy, dz, fx, fy, fz) {
	f32 center = camera_boom_probe(ox, oy, oz, dx, dy, dz, 4.72);
	f32 near_x = ox + fx * 0.16;
	f32 near_y = oy + fy * 0.16;
	f32 near_z = oz + fz * 0.16;
	f32 half_height = 0.16 / view_scale;
	f32 half_width = half_height * frame_values[20];
	f32 ux = 0.0 - sin_yaw * sin_pitch * half_height;
	f32 uy = cos_pitch * half_height;
	f32 uz = cos_yaw * sin_pitch * half_height;
	f32 sx = cos_yaw * half_width;
	f32 sz = sin_yaw * half_width;
	f32 corner0 = camera_corner(near_x, near_y, near_z, ux, uy, uz, sx, sz, dx, dy, dz, center);
	f32 corner1 = camera_corner(near_x, near_y, near_z, ux, uy, uz, 0.0 - sx, 0.0 - sz, dx, dy, dz, corner0);
	f32 corner2 = camera_corner(near_x, near_y, near_z, 0.0 - ux, 0.0 - uy, 0.0 - uz, sx, sz, dx, dy, dz, corner1);
	camera_corner(near_x, near_y, near_z, 0.0 - ux, 0.0 - uy, 0.0 - uz, 0.0 - sx, 0.0 - sz, dx, dy, dz, corner2)
};

unit(RayHit, f32, f32, f32) publish_play_frame = fn(hit, dt, advance_x, advance_z) {
	if (!third_person) {
		publish_avatar(false);
		center_aim();
		publish_frame(camera_pose.x, camera_pose.y, camera_pose.z, sin_yaw, cos_yaw, sin_pitch, cos_pitch, camera_pose.pitch, hit);
	} else {
		f32 fx = sin_yaw * cos_pitch;
		f32 fy = sin_pitch;
		f32 fz = 0.0 - cos_yaw * cos_pitch;
		f32 shoulder = clamp_f(frame_values[20] * 0.19, 0.035, 0.24);
		f32 dx = 0.0 - 0.92 * sin_yaw + shoulder * cos_yaw;
		f32 dy = clamp_f(0.18 - sin_pitch * 0.58, 0.10, 0.60);
		f32 dz = 0.92 * cos_yaw + shoulder * sin_yaw;
		f32 back = 0.92 * cos_pitch - dy * sin_pitch;
		f32 lift = 0.92 * sin_pitch + dy * cos_pitch;
		f32 terrain_limit = chase_terrain_limit(camera_pose.x, camera_pose.y, camera_pose.z, dx, dy, dz, fx, fy, fz);
		f32 aim_distance = if (hit.face < 0) { 5.0 } else {
			clamp_f(ray_hit_distance(hit, camera_pose.x, camera_pose.y, camera_pose.z, fx, fy, fz), 0.0, 5.0)
		};
		f32 reach = aim_distance + 0.035;
		f32 tx = camera_pose.x + fx * reach;
		f32 ty = camera_pose.y + fy * reach;
		f32 tz = camera_pose.z + fz * reach;
		f32 limit = if (hit.face < 0 || camera_sees_target(hit.position.x, hit.position.y, hit.position.z, camera_pose.x + dx * terrain_limit,
			camera_pose.y + dy * terrain_limit, camera_pose.z + dz * terrain_limit, tx, ty, tz)) { terrain_limit } else {
			find_visible_boom(hit.position.x, hit.position.y, hit.position.z, dx, dy, dz, tx, ty, tz, 0.0, terrain_limit, 5)
		};
		f32 predicted = if (dt > 0.0 && (advance_x != 0.0 || advance_z != 0.0)) {
			f32 ahead_x = clamp_f(advance_x * (0.22 / dt), -0.70, 0.70);
			f32 ahead_z = clamp_f(advance_z * (0.22 / dt), -0.70, 0.70);
			f32 next_limit = chase_terrain_limit(camera_pose.x + ahead_x, camera_pose.y, camera_pose.z + ahead_z, dx, dy, dz, fx, fy, fz);
			clamp_f(next_limit, limit - 2.0, limit)
		} else { limit };
		f32 pace = if (predicted < boom_distance) { 11.0 } else { 5.0 };
		f32 time = dt * pace;
		f32 blended = if (!boom_initialized || limit < boom_distance) { limit } else {
			clamp_f(boom_distance + (predicted - boom_distance) * time / (1.0 + time * 0.5), 0.0, limit)
		};
		f32 distance = if (hit.face < 0 || blended == limit || camera_sees_target(hit.position.x, hit.position.y, hit.position.z, camera_pose.x + dx * blended,
			camera_pose.y + dy * blended, camera_pose.z + dz * blended, tx, ty, tz)) { blended } else { limit };
		boom_distance = distance;
		boom_initialized = true;
		f32 depth = clamp_f(aim_distance + back * distance, 0.16, 9.0);
		f32 projected = view_scale * distance / depth;
		aim_was_offset = true;
		host.aim(clamp_f(0.0 - shoulder * projected / frame_values[20], -0.94, 0.94),
			clamp_f(0.0 - lift * projected, -0.94, 0.94));
		f32 clearance_squared = (dx * dx + dy * dy + dz * dz) * distance * distance;
		publish_avatar(clearance_squared >= (if (avatar_visible) { 2.0164 } else { 2.4025 }));
		publish_frame(camera_pose.x + dx * distance, camera_pose.y + dy * distance, camera_pose.z + dz * distance,
			sin_yaw, cos_yaw, sin_pitch, cos_pitch, camera_pose.pitch, hit);
	};
};

f32(i32) lighthouse_part_x = fn(part) {
	if (part == 0) { if (archipelago_hunt) { 28.5 } else { lens_x } } else { if (part == 1) { if (archipelago_hunt) { core.sint_to_float<f32>(eastern_summit_x) + 0.5 } else { 38.45 } } else {
		if (archipelago_hunt) { core.sint_to_float<f32>(western_wreck_x) + 0.5 } else { 24.54 }
	} }
};

f32(i32) lighthouse_part_z = fn(part) {
	if (part == 0) { if (archipelago_hunt) { core.sint_to_float<f32>(north_cave_z) + 0.5 } else { 9.45 } } else { if (part == 1) { if (archipelago_hunt) { 15.5 } else { regulator_z } } else {
		if (archipelago_hunt) { 33.5 } else { igniter_z }
	} }
};

f32(i32) part_distance = fn(part) {
	f32 dx = lighthouse_part_x(part) - camera_pose.x;
	f32 dz = lighthouse_part_z(part) - camera_pose.z;
	dx * dx + dz * dz
};

i32(i32, i32) nearest_part = fn(part, best) {
	if (part == 3) { best } else {
		if ((lighthouse_parts & (1 << part)) != 0) { nearest_part(part + 1, best) } else {
			i32 next = if (best < 0 || part_distance(part) < part_distance(best)) { part } else { best };
			nearest_part(part + 1, next)
		}
	}
};

unit(i32) collect_lighthouse_parts = fn(part) {
	if (part < 3) {
		i32 bit = 1 << part;
		bool right_height = if (archipelago_hunt && part == 1) {
			camera_pose.y >= 14.5 && camera_pose.y <= 14.77
		} else {
			if (archipelago_hunt && part == 2) { camera_pose.y >= 7.5 && camera_pose.y <= 7.77 } else {
				camera_pose.y >= 6.50 && camera_pose.y <= 8.15
			}
		};
		if ((lighthouse_parts & bit) == 0 && right_height && part_distance(part) <= 0.81) {
			lighthouse_parts = lighthouse_parts | bit;
			if (archipelago_hunt) { refresh_cell_owner(floor_i(lighthouse_part_x(part)), floor_i(lighthouse_part_z(part))); };
		};
		collect_lighthouse_parts(part + 1);
	};
};

unit() update_lighthouse = fn {
	if (grounded) { collect_lighthouse_parts(0); };
	bool at_lamp = camera_pose.x >= 23.0 && camera_pose.x < 26.0 && camera_pose.z >= 4.0 && camera_pose.z < 6.0
		&& grounded && camera_pose.y - player_feet >= 5.99 && camera_pose.y - player_feet <= 6.05;
	if (lighthouse_parts == 7 && at_lamp) { restore_lighthouse(); };
};

unit(f32) update_tide = fn(dt) {
	beacon_elapsed = beacon_elapsed + dt;
	tide_progress = if (lighthouse_hunt) {
		0.50 - 0.50 * cosine(wrap_yaw(beacon_elapsed * 0.072))
	} else { clamp_f((beacon_elapsed - 5.0) / 17.0, 0.0, 1.0) };
	sea_level = sea_low + tide_span * tide_progress;
};

unit() restore_lighthouse = fn {
	beacon_phase = BeaconPhase::restored;
	world[14][4][23] = 8; world[14][4][24] = 8; world[14][4][25] = 8;
	world[14][5][23] = 8; world[14][5][24] = 8; world[14][5][25] = 8;
	clear_controls();
	refresh_cell_owner(23, 4);
	refresh_cell_owner(24, 4);
};

unit(f32) update_beacon = fn(dt) {
	bool safe_ground = grounded && camera_pose.y - player_feet >= 4.98 && camera_pose.y - player_feet <= 5.05;
	bool at_first = safe_ground && camera_pose.x >= 23.0 && camera_pose.x < 26.0 && camera_pose.z >= 14.0 && camera_pose.z < 17.0;
	bool at_second = safe_ground && camera_pose.x >= 8.0 && camera_pose.x < 11.0 && camera_pose.z >= 7.0 && camera_pose.z < 10.0;
	if (relay_stage == 0 && at_first) {
		relay_stage = 1;
		beacon_guide = 0;
		guide_drop_slot = -1;
		world[6][15][22] = 8;
		refresh_cell_owner(22, 15);
	} else {
		if (relay_stage == 1 && at_second) {
			relay_stage = 2;
			world[6][8][7] = 8;
			refresh_cell_owner(7, 8);
		};
	};
	bool at_lamp = relay_stage == 2 && camera_pose.x >= 23.0 && camera_pose.x < 26.0 && camera_pose.z >= 4.0 && camera_pose.z < 6.0
		&& grounded && camera_pose.y - player_feet >= 5.99 && camera_pose.y - player_feet <= 6.05;
	if (at_lamp) {
		restore_lighthouse();
	} else {
		f32 lantern_y = camera_pose.y - lamp_offset;
		if (lantern_y < sea_level + swell + chop) {
			bool wet = lantern_y < sea_surface(camera_pose.x, camera_pose.z);
			lamp_wet = clamp_f(lamp_wet + (if (wet) { dt } else { 0.0 - 0.65 * dt }), 0.0, lamp_limit);
		} else {
			if (lamp_wet > 0.0) { lamp_wet = clamp_f(lamp_wet - 0.65 * dt, 0.0, lamp_limit); };
		};
		if (lamp_wet >= lamp_limit) { beacon_phase = BeaconPhase::flooded; clear_controls(); };
	};
};

i32(i32, i32, i32) loose_floor = fn(x, y, z) {
	if (y > 0 && cell(x, y - 1, z) == 0) { loose_floor(x, y - 1, z) } else { y }
};

unit(i32, i32, i32, i32) settle_wood = fn(at, x, y, z) {
	if (at < loose_count) {
		u64 index = index_of(at);
		if (loose_x[index] == x && loose_z[index] == z && loose_y[index] == y + 1) {
			loose_y[index] = loose_floor(x, y, z);
		};
		settle_wood(at + 1, x, y, z);
	};
};

bool(i32, i32, i32, i32) has_loose_wood = fn(at, x, y, z) {
	if (at == loose_count) { false } else {
		u64 slot = index_of(at);
		if (loose_x[slot] == x && loose_y[slot] == y && loose_z[slot] == z) {
			true
		} else { has_loose_wood(at + 1, x, y, z) }
	}
};

bool(u64) within_loose_reach = fn(slot) {
	f32 x = loose_cube_side(loose_x[slot]);
	f32 y = loose_cube_base(loose_y[slot]);
	f32 z = loose_cube_side(loose_z[slot]);
	f32 side = loose_cube_size();
	f32 tx = clamp_f(camera_pose.x, x, x + side);
	f32 ty = clamp_f(camera_pose.y, y, y + side);
	f32 tz = clamp_f(camera_pose.z, z, z + side);
	f32 ox = clamp_f(tx, camera_pose.x - player_radius + contact_skin, camera_pose.x + player_radius - contact_skin);
	f32 oy = clamp_f(ty, camera_pose.y - player_feet + contact_skin, camera_pose.y + player_head - contact_skin);
	f32 oz = clamp_f(tz, camera_pose.z - player_radius + contact_skin, camera_pose.z + player_radius - contact_skin);
	f32 dx = tx - ox;
	f32 dy = ty - oy;
	f32 dz = tz - oz;
	if (dx * dx + dy * dy + dz * dz <= 0.25) {
		trace_pick(ox, oy, oz, dx, dy, dz, 1.0) < 0
	} else { false }
};

i32(i32) reachable_wood = fn(at) {
	if (at == loose_count) { -1 } else {
		if (within_loose_reach(index_of(at))) { at } else { reachable_wood(at + 1) }
	}
};

unit() collect_wood = fn {
	i32 at = reachable_wood(0);
	if (at >= 0) {
		u64 index = index_of(at);
		i32 x = loose_x[index];
		i32 z = loose_z[index];
		loose_count = loose_count - 1;
		if (beacon_guide == 2) {
			if (at == guide_drop_slot) { beacon_guide = 3; guide_drop_slot = -1; } else {
				if (loose_count == guide_drop_slot) { guide_drop_slot = at; };
			};
		};
		u64 last = index_of(loose_count);
		loose_x[index] = loose_x[last];
		loose_y[index] = loose_y[last];
		loose_z[index] = loose_z[last];
		bridge_blocks = bridge_blocks + 1;
		refresh_cell_owner(x, z);
	};
};

unit(f32, f32, i32) tick = fn(dt, aspect, playing) {
	f32 zero = 0.0;
	f32 upper_step = 0.06;
	f32 step = if (dt > zero && dt <= 3.402823466e38) { clamp_f(dt, zero, upper_step) } else { zero };
	frame_values[20] = if (aspect >= 0.05 && aspect <= 20.0) { aspect } else { 1.0 };
	clock_seconds = clock_seconds + step;
	update_orientation();
	if (playing != 0) {
		f32 old_x = camera_pose.x;
		f32 old_z = camera_pose.z;
		if (beacon_phase == BeaconPhase::sandbox || beacon_phase == BeaconPhase::active) {
			if (step > 0.0) {
				if (beacon_phase == BeaconPhase::active) { update_tide(step); };
				sea_phase = wrap_yaw(sea_phase + step * 0.92);
				publish_water();
			};
			move_camera(step, sin_yaw, cos_yaw);
			if (beacon_phase == BeaconPhase::active && step > 0.0) {
				sync_terrain(false);
				if (loose_count > 0) { collect_wood(); };
			};
			if (edit_pose_time > 0.0 && step > 0.0) { edit_pose_time = clamp_f(edit_pose_time - step, 0.0, 0.34); };
			advance_edits(step);
			if (beacon_phase == BeaconPhase::active && step > 0.0) {
			if (lighthouse_hunt) { update_lighthouse(); } else { update_beacon(step); };
		};
		};
		RayHit hit = if (beacon_phase == BeaconPhase::restored || beacon_phase == BeaconPhase::flooded) { no_hit } else { current_view_target() };
		publish_outline(hit);
		publish_play_frame(hit, step, camera_pose.x - old_x, camera_pose.z - old_z);
	} else {
		publish_outline(no_hit);
		publish_avatar(false);
		center_aim();
		publish_frame(camera_pose.x, camera_pose.y, camera_pose.z, sin_yaw, cos_yaw, sin_pitch, cos_pitch, camera_pose.pitch, no_hit);
	};
};

i32(i32, i32, i32, i32) beacon_edit_status = fn(x, y, z, material) {
	if (beacon_phase != BeaconPhase::active || harbor_hut(x, y, z)) { -4 } else {
		u8 present = cell(x, y, z);
		bool loosen = material == 0 && present == 5 && !mission_fixed_wood(x, y, z);
		bool open_tunnel = material == 0 && present == 4 && soft_plug(x, y, z);
		bool place = material == 5 && present == 0 && bridge_blocks > 0;
		if (!(loosen || open_tunnel || place)) { -4 } else {
			if (loosen && loose_count >= 48) { -6 } else {
				if (place && has_loose_wood(0, x, y, z)) { -5 } else { 1 }
			}
		}
	}
};

i32(i32, i32, i32, i32) edit_beacon = fn(x, y, z, material) {
	i32 status = beacon_edit_status(x, y, z, material);
	if (status != 1) { status } else {
		bool loosen = material == 0 && cell(x, y, z) == 5;
		i32 changed = write_cell(x, y, z, material);
		if (changed == 1) {
			if (material == 5) {
				bridge_blocks = bridge_blocks - 1;
				if (crossing_plank(x, y, z)) { beacon_guide = 0; guide_drop_slot = -1; };
			} else {
				if (loose_count > 0) { settle_wood(0, x, y, z); };
				if (loosen) {
					if (beacon_guide == 1) { beacon_guide = 2; guide_drop_slot = loose_count; };
					u64 slot = index_of(loose_count);
					loose_x[slot] = x;
					loose_y[slot] = loose_floor(x, y, z);
					loose_z[slot] = z;
					loose_count = loose_count + 1;
				};
			};
			rebuild_near(x, z);
		};
		changed
	}
};

CellPosition(RayHit) adjacent_cell = fn(hit) {
	i32 side = hit.face;
	i32 x = hit.position.x + (if (side == 0) { -1 } else { if (side == 1) { 1 } else { 0 } });
	i32 y = hit.position.y + (if (side == 2) { -1 } else { if (side == 3) { 1 } else { 0 } });
	i32 z = hit.position.z + (if (side == 4) { -1 } else { if (side == 5) { 1 } else { 0 } });
	cell_position(x, y, z)
};

unit(RayHit) publish_beacon_guide = fn(hit) {
	i32 stage = if (beacon_phase == BeaconPhase::active) { beacon_guide } else { 0 };
	frame_values[30] = core.sint_to_float<f32>(stage);
	if (stage != 0) {
		CellPosition key = if (stage == 1) { guide_timber } else {
			if (stage == 2) {
				u64 slot = index_of(guide_drop_slot);
				cell_position(loose_x[slot], loose_y[slot], loose_z[slot])
			} else { guide_crossing }
		};
		i32 x = key.x;
		i32 y = key.y;
		i32 z = key.z;
		bool ready = if (hit.face < 0) { false } else {
			if (stage == 1) {
				same_position(hit.position, key) && beacon_edit_status(x, y, z, 0) == 1
			} else {
				stage == 3 && same_position(adjacent_cell(hit), key) && !overlaps_player(x, y, z)
					&& beacon_edit_status(x, y, z, 5) == 1
			}
		};
		frame_values[31] = core.sint_to_float<f32>(x) + 0.50;
		frame_values[32] = core.sint_to_float<f32>(y) + (if (stage == 2) { 0.14 } else { 0.70 });
		frame_values[33] = core.sint_to_float<f32>(z) + 0.50;
		frame_values[34] = if (ready) { 1.0 } else { 0.0 };
	} else {
		frame_values[31] = 0.0;
		frame_values[32] = 0.0;
		frame_values[33] = 0.0;
		frame_values[34] = 0.0;
	};
};

i32(i32) edit_view = fn(material) {
	update_orientation();
	RayHit hit = current_view_target();
	if (hit.face < 0) { -1 } else {
		CellPosition key = if (material > 0) { adjacent_cell(hit) } else { hit.position };
		if (material > 0 && !inside(key.x, key.y, key.z) && !editable_exterior(key.x, key.y, key.z)) { -2 } else {
			i32 x = key.x;
			i32 y = key.y;
			i32 z = key.z;
			if (material > 0 && overlaps_player(x, y, z)) { -3 } else {
				if (beacon_phase == BeaconPhase::sandbox) {
					i32 changed = write_cell(x, y, z, material);
					if (changed == 1) { rebuild_near(x, z); };
					changed
				} else {
					if (editable_exterior(x, y, z)) { edit_exterior(x, y, z, material) } else { edit_beacon(x, y, z, material) }
				}
			}
		}
	}
};

i32(i32) apply_edit_mode = fn(mode) {
	i32 result = if (mode == 0) { edit_view(0) } else { edit_view(selected_material) };
	if (result == 1 && (edit_pose_place != (mode == 1) || edit_pose_time <= 0.13)) {
		edit_pose_time = 0.34;
		edit_pose_place = mode == 1;
	};
	result
};

i32(i32, i32) edit_control = fn(mode, state) {
	if (mode != 0 && mode != 1) { 0 } else {
		i32 bit = 1 << mode;
		if (state == 0) {
			held_edits = held_edits & ~bit;
			if (repeat_edit_mode == mode) {
				repeat_edit_mode = if (held_edits == 0) { -1 } else { 1 - mode };
				repeat_edit_wait = 0.24;
			};
			0
		} else {
			if ((held_edits & bit) != 0) { 0 } else {
				if (state == 1) {
					held_edits = held_edits | bit;
					repeat_edit_mode = mode;
					repeat_edit_wait = 0.24;
					apply_edit_mode(mode)
				} else {
					if (state == 2) { apply_edit_mode(mode) } else { 0 }
				}
			}
		}
	}
};

unit(f32) advance_edits = fn(dt) {
	if (repeat_edit_mode >= 0 && dt > 0.0) {
		repeat_edit_wait = repeat_edit_wait - dt;
		if (repeat_edit_wait <= 0.0) {
			apply_edit_mode(repeat_edit_mode);
			repeat_edit_wait = repeat_edit_wait + 0.115;
		};
	};
};

unit(i32) select_material = fn(material) {
	if (beacon_phase == BeaconPhase::sandbox && material >= 1 && material <= 6) { selected_material = material; };
};

unit(i32) cycle_material = fn(delta) {
	if (beacon_phase == BeaconPhase::sandbox && delta > 0) {
		selected_material = if (selected_material == 6) { 1 } else { selected_material + 1 };
	};
	if (beacon_phase == BeaconPhase::sandbox && delta < 0) {
		selected_material = if (selected_material == 1) { 6 } else { selected_material - 1 };
	};
};

i32() place_selected = fn { edit_view(selected_material) };
i32 seed_phase = 4;
bool seed_trim = false;
bool seed_negative = false;
i64 seed_magnitude = 0;

i32() default_seed = fn { 471 };

unit(i32) seed_begin = fn(trim) {
	seed_phase = 0;
	seed_trim = trim != 0;
	seed_negative = false;
	seed_magnitude = 0;
};

bool(i32) seed_trim_space = fn(value) {
	(value >= 9 && value <= 13) || value == 32 || value == 160 || value == 5760
		|| (value >= 8192 && value <= 8202) || value == 8232 || value == 8233
		|| value == 8239 || value == 8287 || value == 12288 || value == 65279
};

i32() reject_seed = fn { seed_phase = 4; 0 };

i32(i32) seed_code_unit = fn(value) {
	if (seed_phase == 4) { 0 } else {
		if (value >= 48 && value <= 57) {
			if (seed_phase == 3) { reject_seed() } else {
				i64 next = seed_magnitude * 10 + core.int_extend<i64>(value - 48);
				i64 limit = if (seed_negative) { 2147483648 } else { 2147483647 };
				if (next > limit) { reject_seed() } else {
					seed_magnitude = next;
					seed_phase = 2;
					1
				}
			}
		} else {
			if (seed_phase == 0 && value == 45) {
				seed_negative = true;
				seed_phase = 1;
				1
			} else {
				if (seed_trim && seed_phase != 1 && seed_trim_space(value)) {
					if (seed_phase == 2) { seed_phase = 3; };
					1
				} else { reject_seed() }
			}
		}
	}
};

i64() seed_end = fn {
	if (seed_phase == 2 || seed_phase == 3) {
		if (seed_negative) { -seed_magnitude } else { seed_magnitude }
	} else { 2147483648 }
};

%%end
