%%start
layout = namespace flight "maps/layout.w";

layout.Runway home = { .x = -111.0; .z = -199.0; .width = 36.0; .length = 67.0; };
layout.Runway supply = { .x = -111.0; .z = -71.0; .width = 36.0; .length = 109.0; };
layout.Runway finish = { .x = 125.0; .z = 290.0; .width = 41.0; .length = 124.0; };

layout.Course() course_layout = fn {
	layout.Course selected = { .home = home; .supply = supply; .finish = finish; };
	selected
};
layout.GabledLandmark quay_station = {
	.x = 353.0; .z = 458.0; .width = 33.0; .length = 23.0; .eaves = 12.0; .ridge = 18.0;
};

f32() station_x = fn { quay_station.x };
f32() station_z = fn { quay_station.z };
f32() station_width = fn { quay_station.width };
f32() station_length = fn { quay_station.length };
f32() station_eaves = fn { quay_station.eaves };
f32() station_ridge = fn { quay_station.ridge };

bool(f32,f32,f32) station_hit = fn(x,y,z) {
	f32 dx = x-quay_station.x;
	f32 dz = z-quay_station.z;
	if (dx < 0.0 || dx > quay_station.width || dz < 0.0 || dz > quay_station.length || y >= quay_station.ridge) { false } else {
		f32 half = quay_station.width*0.5;
		f32 rise = (if (dx < half) { dx } else { quay_station.width-dx })/half;
		y < quay_station.eaves+(quay_station.ridge-quay_station.eaves)*rise
	}
};
%%end
