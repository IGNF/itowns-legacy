
<p align="center">
<img src="http://www.itowns.fr/images/logo-itowns2XS.png" />
</p>

# iTowns V0
### What is it?

iTowns is a web application in Javascript/WebGL for visualisation of 3D geographic data allowing precise measurements in 3D.
Its first purpose was the visualisation of street view images and terrestrial lidar point cloud. It has then been extended to handle more types of input.

### Handled data
    - Oriented images
    - Panoramic images
    - Point Clouds
    - 3D textured models
    - WFS Vector

    
![iTowns screenshot](http://www.itowns.fr/videos/screenshotGIT.jpg)

The V0 of iTowns Open Source is the core of the original iTowns from IGN Matis lab. As so, it contains a subset of the application features.
### Functionalities

- Load and project Oriented Images on mesh (cube or city model)
- Load and display Panoramic Images
- Load Depth Panoramic Image and render in 3D
- Load 2D multipolygons with height (building footprint) from WFS or local file and triangulate it to create building boxes. This mesh can then be use for texture projection.
- Navigate through Image Data using click and go functions
- Load and display Point Cloud from PLY files.
- Load and display 3D textured models (B3D, 3DS).
- Simple API interface.

### How can I test it with sample data?

 Download all the sample data here : https://github.com/iTowns/itowns-sample-data
 
- 250 Oriented Images (50 Panoramics, 192 mo)
- 1 patch (500 * 500m) of 3D textured city models (BATI3D, 50 mo)
- Terrestrial PointCloud (20 Millions point, 400 mo)
- JSON of building footprint and DTM (500 ko)

Put the data inside a directory named *data* at the root of the application itowns and here you go!


### Notes:
The application should be able to work without the need of a local Database or PHP scripts. But you will still need to have a local server running like apache.




### In Progress
    - Simplifying the code
    - Documentation
    - OffLine examples
    - Sample Data
    - Python code for data preparation