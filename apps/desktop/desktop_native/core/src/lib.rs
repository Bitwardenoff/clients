pub mod biometric;
pub mod clipboard;
pub mod crypto;
pub mod error;
pub mod password;

#[allow(non_snake_case)]
pub mod com {
    use windows::{
        core::*,
        Win32::{Foundation::BOOL, System::Com::*},
    };

    // Implemented using windows-rs provided traits
    #[implement(IMallocSpy)]
    struct MallocSpy();

    impl IMallocSpy_Impl for MallocSpy {
        fn PreAlloc(&self, cbrequest: usize) -> usize {
            println!("PreAlloc");
            cbrequest
        }

        fn PostAlloc(&self, pactual: *const core::ffi::c_void) -> *mut core::ffi::c_void {
            println!("PostAlloc");
            pactual as *mut core::ffi::c_void
        }

        fn PreFree(
            &self,
            prequest: *const core::ffi::c_void,
            fspyed: BOOL,
        ) -> *mut core::ffi::c_void {
            println!("PreFree");
            prequest as *mut core::ffi::c_void
        }

        fn PostFree(&self, fspyed: BOOL) {
            println!("PostFree");
        }

        fn PreRealloc(
            &self,
            prequest: *const core::ffi::c_void,
            cbrequest: usize,
            ppnewrequest: *mut *mut core::ffi::c_void,
            fspyed: BOOL,
        ) -> usize {
            println!("PreRealloc");
            cbrequest
        }

        fn PostRealloc(
            &self,
            pactual: *const core::ffi::c_void,
            fspyed: BOOL,
        ) -> *mut core::ffi::c_void {
            println!("PostRealloc");
            pactual as *mut core::ffi::c_void
        }

        fn PreGetSize(
            &self,
            prequest: *const core::ffi::c_void,
            fspyed: BOOL,
        ) -> *mut core::ffi::c_void {
            println!("PreGetSize");
            prequest as *mut core::ffi::c_void
        }

        fn PostGetSize(&self, cbactual: usize, fspyed: BOOL) -> usize {
            println!("PostGetSize");
            cbactual
        }

        fn PreDidAlloc(
            &self,
            prequest: *const core::ffi::c_void,
            fspyed: BOOL,
        ) -> *mut core::ffi::c_void {
            println!("PreDidAlloc");
            prequest as *mut core::ffi::c_void
        }

        fn PostDidAlloc(
            &self,
            prequest: *const core::ffi::c_void,
            fspyed: BOOL,
            factual: i32,
        ) -> i32 {
            println!("PostDidAlloc");
            factual
        }

        fn PreHeapMinimize(&self) {
            println!("PreHeapMinimize");
        }

        fn PostHeapMinimize(&self) {
            println!("PostHeapMinimize");
        }
    }

    // Implemented with our own traits
    // https://gist.github.com/kant2002/0b50eeb6cf770bd72854b95a99b86deb
    #[interface("0000001d-0000-0000-C000-000000000046")]
    unsafe trait IMallocSpy2: IUnknown {
        fn PreAlloc(&self, cbrequest: usize) -> usize;
        fn PostAlloc(&self, pactual: *const core::ffi::c_void) -> *mut core::ffi::c_void;
        fn PreFree(
            &self,
            prequest: *const core::ffi::c_void,
            fspyed: BOOL,
        ) -> *mut core::ffi::c_void;
        fn PostFree(&self, fspyed: BOOL);
        fn PreRealloc(
            &self,
            prequest: *const core::ffi::c_void,
            cbrequest: usize,
            ppnewrequest: *mut *mut core::ffi::c_void,
            fspyed: BOOL,
        ) -> usize;
        fn PostRealloc(
            &self,
            pactual: *const core::ffi::c_void,
            fspyed: BOOL,
        ) -> *mut core::ffi::c_void;
        fn PreGetSize(
            &self,
            prequest: *const core::ffi::c_void,
            fspyed: BOOL,
        ) -> *mut core::ffi::c_void;
        fn PostGetSize(&self, cbactual: usize, fspyed: BOOL) -> usize;
        fn PreDidAlloc(
            &self,
            prequest: *const core::ffi::c_void,
            fspyed: BOOL,
        ) -> *mut core::ffi::c_void;
        fn PostDidAlloc(
            &self,
            prequest: *const core::ffi::c_void,
            fspyed: BOOL,
            factual: i32,
        ) -> i32;
        fn PreHeapMinimize(&self);
        fn PostHeapMinimize(&self);
    }

    #[implement(IMallocSpy2)]
    struct MallocSpy2();

    impl IMallocSpy2_Impl for MallocSpy2 {
        unsafe fn PreAlloc(&self, cbrequest: usize) -> usize {
            println!("PreAlloc2");
            cbrequest
        }

        unsafe fn PostAlloc(&self, pactual: *const core::ffi::c_void) -> *mut core::ffi::c_void {
            println!("PostAlloc2");
            pactual as *mut core::ffi::c_void
        }

        unsafe fn PreFree(
            &self,
            prequest: *const core::ffi::c_void,
            fspyed: BOOL,
        ) -> *mut core::ffi::c_void {
            println!("PreFree2");
            prequest as *mut core::ffi::c_void
        }

        unsafe fn PostFree(&self, fspyed: BOOL) {
            println!("PostFree2");
        }

        unsafe fn PreRealloc(
            &self,
            prequest: *const core::ffi::c_void,
            cbrequest: usize,
            ppnewrequest: *mut *mut core::ffi::c_void,
            fspyed: BOOL,
        ) -> usize {
            println!("PreRealloc2");
            cbrequest
        }

        unsafe fn PostRealloc(
            &self,
            pactual: *const core::ffi::c_void,
            fspyed: BOOL,
        ) -> *mut core::ffi::c_void {
            println!("PostRealloc2");
            pactual as *mut core::ffi::c_void
        }

        unsafe fn PreGetSize(
            &self,
            prequest: *const core::ffi::c_void,
            fspyed: BOOL,
        ) -> *mut core::ffi::c_void {
            println!("PreGetSize2");
            prequest as *mut core::ffi::c_void
        }

        unsafe fn PostGetSize(&self, cbactual: usize, fspyed: BOOL) -> usize {
            println!("PostGetSize2");
            cbactual
        }

        unsafe fn PreDidAlloc(
            &self,
            prequest: *const core::ffi::c_void,
            fspyed: BOOL,
        ) -> *mut core::ffi::c_void {
            println!("PreDidAlloc2");
            prequest as *mut core::ffi::c_void
        }

        unsafe fn PostDidAlloc(
            &self,
            prequest: *const core::ffi::c_void,
            fspyed: BOOL,
            factual: i32,
        ) -> i32 {
            println!("PostDidAlloc2");
            factual
        }

        unsafe fn PreHeapMinimize(&self) {
            println!("PreHeapMinimize2");
        }

        unsafe fn PostHeapMinimize(&self) {
            println!("PostHeapMinimize2");
        }
    }

    #[inline]
    unsafe fn CoRegisterMallocSpy2<P0>(pmallocspy: P0) -> windows_core::Result<()>
    where
        P0: windows_core::Param<IMallocSpy2>,
    {
        windows_targets::link!("ole32.dll" "system" fn CoRegisterMallocSpy(pmallocspy : * mut core::ffi::c_void) -> windows_core::HRESULT);
        CoRegisterMallocSpy(pmallocspy.param().abi()).ok()
    }

    pub fn register() {
        //let m: IMallocSpy = MallocSpy().into();
        // unsafe { CoRegisterMallocSpy(&m).unwrap() };

        let m: IMallocSpy2 = MallocSpy2().into();
        unsafe { CoRegisterMallocSpy2(&m).unwrap() };
    }
}
