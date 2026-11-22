%%start
struct copy Runway {
	f32 x;
	f32 z;
	f32 width;
	f32 length;
}

struct copy Course {
	Runway home;
	Runway supply;
	Runway finish;
}
struct copy GabledLandmark {
	f32 x;
	f32 z;
	f32 width;
	f32 length;
	f32 eaves;
	f32 ridge;
}
struct copy CountyReservoir {
	f32 x;
	f32 z;
	f32 across;
	f32 along;
	f32 tower_x;
	f32 tower_z;
}
%%end
