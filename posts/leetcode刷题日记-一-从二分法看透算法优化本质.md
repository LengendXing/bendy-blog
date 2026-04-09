> 文章来源说明
> 

```java
public int search(int[] nums, int target) {
        int i = 0, j = nums.length-1;
        while (i<=j) {
            int m = (i+j) >>> 1;
            if (nums[m] > target) {
                j = m -1;
            } else if (nums[m] < target) {
                i = m + 1;
            }else {
                return m;
            }
        }
        return -1;
    }
```

```java
 public int searchLeftMost(int[] nums, int target) {
        int i = 0, j = nums.length;
        while (i<=j) {
            int m = (i+j) >>> 1;
            if (nums[m] >=target) {
                j = m -1;
            } else {
                i = m + 1;
            }
        }
        return i;
    }

    public int searchRightMost(int[] nums, int target) {
        int i = 0, j = nums.length;
        while (i<=j) {
            int m = (i+j) >>> 1;
            if (nums[m] >target) {
                j = m -1;
            } else {
                i = m + 1;
            }
        }
        return i - 1;
    }
```

```java
 public int searchStronger(int[] nums, int target) {
        int i = 0, j = nums.length;
        while (i < j) {
            int m = (i+j) >>> 1;
            if (nums[m] > target) {
                j = m ;
            } else if (nums[m] < target) {
                i = m + 1;
            }else {
                return m;
            }
        }
        return -1;
    }

```

尽管按照上述代码，对原始二分进行了逻辑修改，将二分搜索的范围由原始的左闭右闭改成了左闭右开，明确了以左边为主要检索区域，右边界不参与检索，但是代码在本质上执行的时候，仍旧在所有可能出现的情况下执行的性能，根据渐进上界公式，大O表示为O(log(n)),渐进下界为O(1)，整体并不平均，因此，在数据量的时候，性能不稳定，那么如果作为一个算法工程师，需要改良增强后的二分法则，那么着手的方向我想应该是将性能稳定在θ(log(n))，即渐进上界与渐进下界都是O(log(n))。那么修改的方法就是将判断次数由原来的三次修改为两次。

```java

    public int search_average(int[] nums, int target) {
        int i = 0, j = nums.length;
        while (i<j-1) {
            int m = (i+j) >>> 1;
            if (nums[m] > target) {
                j = m ;
            } else {
                i = m;
            }
        }
        if (nums[i]==target){
            return i;
        }
        return -1;
    }
```

致谢：

<aside>
💡 有关Notion安装或者使用上的问题，欢迎您在底部评论区留言，一起交流~

</aside>