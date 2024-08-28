use glob::glob;

fn main() {
    let mut builder = cc::Build::new();

    // Auto compile all .m files in the src/native directory
    for entry in glob("src/native/**/*.m").expect("Failed to read glob pattern") {
        let path = entry.expect("Failed to read glob entry");
        builder.file(path);
    }

    builder
        .flag("-fobjc-arc") // Enable Auto Reference Counting (ARC)
        .compile("autofill");
}
