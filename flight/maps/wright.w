%%start
layout = namespace flight "maps/layout.w";

layout.Runway home = { .x = -15.0; .z = -74.0; .width = 29.0; .length = 67.0; };
layout.Runway supply = { .x = -15.0; .z = 68.0; .width = 29.0; .length = 109.0; };
layout.Runway finish = { .x = -15.0; .z = 331.0; .width = 25.0; .length = 74.0; };

layout.Course() course_layout = fn {
	layout.Course selected = { .home = home; .supply = supply; .finish = finish; };
	selected
};
layout.CountyReservoir west_reservoir = {
	.x = -352.0; .z = 287.0; .across = 52.0; .along = 35.0;
	.tower_x = -468.0; .tower_z = 299.0;
};

f32() reservoir_x = fn { west_reservoir.x };
f32() reservoir_z = fn { west_reservoir.z };
f32() reservoir_width = fn { west_reservoir.across };
f32() reservoir_length = fn { west_reservoir.along };
f32() reservoir_tower_x = fn { west_reservoir.tower_x };
f32() reservoir_tower_z = fn { west_reservoir.tower_z };
%%end
